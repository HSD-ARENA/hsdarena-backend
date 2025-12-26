import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { WebsocketAuthGuard } from './guards/websocket-auth.guard';
import { WsThrottlerGuard } from './guards/ws-throttler.guard';
import { WsLoggingInterceptor } from './interceptors/ws-logging.interceptor';
import { WebsocketService } from './websocket.service';
import { SessionsService } from '../sessions/sessions.service';
import { AuthenticatedSocket, JoinSessionPayload } from './types/websocket.types';
import { JwtService } from '@nestjs/jwt';
import { QuestionDto, LeaderboardEntryDto } from './dto/quiz-events.dto';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? '*'
      : (process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']),
    credentials: true
  },
  namespace: '/realtime',
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(QuizGateway.name);
  @WebSocketServer()
  server: Server;

  // Track active question timers per session
  private sessionTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
  ) { }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`🔌 Client attempting connection: ${client.id}`);

    const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`❌ No token provided for client: ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      // Try admin secret first, then team secret
      let payload;
      try {
        payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_ADMIN_SECRET
        });
      } catch {
        payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_TEAM_SECRET
        });
      }

      client.teamId = payload.teamId || payload.adminId;
      this.logger.log(`✅ Client authenticated: ${client.id}`);
    } catch (error) {
      this.logger.warn(`❌ Invalid token for client: ${client.id}`);
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`👋 Client disconnected: ${client.id}`);
    this.websocketService.removeClientFromRoom(client);
  }

  @UseInterceptors(WsLoggingInterceptor)
  @SubscribeMessage('join_session')
  async handleJoinSession(client: AuthenticatedSocket, payload: JoinSessionPayload) {
    try {
      if (!payload.sessionCode) {
        throw new WsException('Session code is required');
      }

      this.websocketService.addClientToRoom(payload.sessionCode, client);

      client.emit('join_success', {
        sessionCode: payload.sessionCode,
      });
    } catch (error) {
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to join session',
      });
    }
  }

  @UseInterceptors(WsLoggingInterceptor)
  @SubscribeMessage('question:get-current')
  async handleGetCurrentQuestion(client: AuthenticatedSocket, payload: { sessionCode: string }) {
    try {
      if (!payload.sessionCode) {
        throw new WsException('Session code is required');
      }

      // SessionsService'den mevcut soruyu al
      const currentQuestion = await this.sessionsService.getCurrentQuestion(payload.sessionCode);

      // Client'a geri gönder
      client.emit('question:current', {
        sessionCode: payload.sessionCode,
        question: currentQuestion,
      });
    } catch (error) {
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to get current question',
      });
    }
  }

  // Session events
  broadcastSessionStarted(sessionCode: string) {
    this.websocketService.broadcastToRoom(sessionCode, 'session:started', {
      sessionCode,
      timestamp: new Date().toISOString()
    });
    this.logger.debug(`Session started: ${sessionCode}`);
  }

  broadcastSessionEnded(sessionCode: string) {
    this.websocketService.broadcastToRoom(sessionCode, 'session:ended', {
      sessionCode,
      timestamp: new Date().toISOString()
    });
    // Clear any active timer when session ends
    this.clearQuestionTimer(sessionCode);
    this.logger.debug(`Session ended: ${sessionCode}`);
  }

  // Question events
  broadcastQuestionStarted(sessionCode: string, questionIndex: number, question: QuestionDto) {
    try {
      this.websocketService.broadcastToRoom(sessionCode, 'question:started', {
        sessionCode,
        questionIndex,
        question: {
          id: question.id,
          text: question.text,
          type: question.type,
          choices: question.choices,
          timeLimitSec: question.timeLimitSec,
          points: question.points,
        }
      });
      this.logger.debug(`Question started for session ${sessionCode}: ${question.id}`);

      // Start timer for this question
      this.startQuestionTimer(sessionCode, question.timeLimitSec);
    } catch (error) {
      this.logger.error(`Failed to broadcast question start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined);
      throw new WsException('Failed to broadcast question');
    }
  }

  broadcastQuestionTimeWarning(sessionCode: string, questionIndex: number, remainingSeconds: number) {
    this.websocketService.broadcastToRoom(sessionCode, 'question:time-warning', {
      sessionCode,
      questionIndex,
      remainingSeconds
    });
    this.logger.debug(`Time warning for session ${sessionCode}, question ${questionIndex}: ${remainingSeconds}s remaining`);
  }

  // Timer management
  private startQuestionTimer(sessionCode: string, timeLimitSec: number) {
    // Clear any existing timer for this session
    this.clearQuestionTimer(sessionCode);

    // Start new timer
    const timer = setTimeout(() => {
      this.logger.log(`⏰ Time's up for session ${sessionCode}`);
      this.websocketService.broadcastToRoom(sessionCode, 'time:up', {
        sessionCode
      });
      // Clean up timer from map
      this.sessionTimers.delete(sessionCode);
    }, timeLimitSec * 1000); // Convert to milliseconds

    this.sessionTimers.set(sessionCode, timer);
    this.logger.log(`⏱️ Timer started for session ${sessionCode}: ${timeLimitSec}s`);
  }

  private clearQuestionTimer(sessionCode: string) {
    const existingTimer = this.sessionTimers.get(sessionCode);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.sessionTimers.delete(sessionCode);
      this.logger.log(`🗑️ Timer cleared for session ${sessionCode}`);
    }
  }

  broadcastQuestionEnded(sessionCode: string, questionIndex: number) {
    this.websocketService.broadcastToRoom(sessionCode, 'question:ended', {
      sessionCode,
      questionIndex,
      timestamp: new Date().toISOString()
    });
    this.logger.debug(`Question ended for session ${sessionCode}, index ${questionIndex}`);
  }

  // Answer events
  broadcastAnswerSubmitted(sessionCode: string, teamId: string) {
    this.websocketService.broadcastToRoom(sessionCode, 'answer:submitted', {
      sessionCode,
      teamId,
      timestamp: new Date().toISOString()
    });
  }

  broadcastAnswerStatsUpdated(sessionCode: string, stats: { totalAnswers: number; correctAnswers: number }) {
    this.websocketService.broadcastToRoom(sessionCode, 'answer:stats-updated', {
      sessionCode,
      stats
    });
  }

  // Scoreboard events
  broadcastScoreboardUpdated(sessionCode: string, leaderboard: LeaderboardEntryDto[]) {
    this.websocketService.broadcastToRoom(sessionCode, 'scoreboard:updated', {
      sessionCode,
      leaderboard: leaderboard.map((team) => ({
        teamName: team.teamName,
        score: team.score,
        rank: team.rank,
      })),
      timestamp: new Date().toISOString()
    });
    this.logger.debug(`Scoreboard updated for session ${sessionCode}`);
  }

  // Admin control events (Client → Server)
  @SubscribeMessage('admin:next-question')
  async handleAdminNextQuestion(client: AuthenticatedSocket, payload: { sessionCode: string }) {
    try {
      if (!payload.sessionCode) {
        throw new WsException('Session code is required');
      }

      this.logger.log(`⏭️ Admin triggering next question for session ${payload.sessionCode}`);

      // Session service'i çağırarak sonraki soruya geç
      const result = await this.sessionsService.nextQuestion(payload.sessionCode);

      this.logger.log(`Result from nextQuestion: finished=${result.finished}, questionIndex=${result.currentQuestionIndex}`);

      if (result.finished) {
        // Tüm sorular bitti, session'ı sonlandır
        this.logger.log(`🏁 All questions finished for session ${payload.sessionCode}`);
        this.broadcastSessionEnded(payload.sessionCode);

        client.emit('admin:next-question:ack', {
          sessionCode: payload.sessionCode,
          success: true,
          finished: true,
          message: result.message,
        });
      } else {
        //Yeni soruyu broadcast et
        if (!result.question || result.currentQuestionIndex === undefined) {
          this.logger.error(`❌ Invalid question data for session ${payload.sessionCode}`);
          throw new WsException('Invalid question data');
        }

        this.logger.log(`📢 Broadcasting question ${result.currentQuestionIndex} for session ${payload.sessionCode}: "${result.question.text}"`);

        this.broadcastQuestionStarted(
          payload.sessionCode,
          result.currentQuestionIndex,
          {
            id: result.question.id,
            text: result.question.text,
            type: result.question.type as any, // Prisma type'dan QuestionDto type'a cast
            choices: result.question.choices as any,
            points: result.question.points,
            timeLimitSec: result.question.timeLimitSec,
          }
        );

        client.emit('admin:next-question:ack', {
          sessionCode: payload.sessionCode,
          success: true,
          finished: false,
          currentQuestionIndex: result.currentQuestionIndex,
          totalQuestions: result.totalQuestions,
        });
      }
    } catch (error) {
      this.logger.error(`❌ Error in handleAdminNextQuestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to advance question',
      });
    }
  }

  @SubscribeMessage('admin:end-session')
  async handleAdminEndSession(client: AuthenticatedSocket, payload: { sessionCode: string }) {
    try {
      if (!payload.sessionCode) {
        throw new WsException('Session code is required');
      }

      this.logger.log(`Admin ending session ${payload.sessionCode}`);

      // Burada session service'i çağırarak session bitirilebilir
      // Şimdilik sadece event'i broadcast ediyoruz

      this.broadcastSessionEnded(payload.sessionCode);

      client.emit('admin:end-session:ack', {
        sessionCode: payload.sessionCode,
        success: true
      });
    } catch (error) {
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to end session',
      });
    }
  }

  private extractToken(client: AuthenticatedSocket): string | undefined {
    return client.handshake.auth.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');
  }
}