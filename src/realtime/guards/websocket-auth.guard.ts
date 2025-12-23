import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from '../types/websocket.types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WebsocketAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: AuthenticatedSocket = context.switchToWs().getClient();
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Authentication token not provided');
    }

    try {
      // Try admin secret first
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_ADMIN_SECRET
        });
        client.teamId = payload.teamId || payload.adminId;
        return true;
      } catch {
        // If admin secret fails, try team secret
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_TEAM_SECRET
        });
        client.teamId = payload.teamId;
        return true;
      }
    } catch (err) {
      throw new WsException('Invalid authentication token');
    }
  }
}