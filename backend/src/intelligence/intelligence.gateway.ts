import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SessionStateService } from '../jarvis/session-state.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class IntelligenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IntelligenceGateway.name);

  constructor(private sessionStateService: SessionStateService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('jarvis:wake')
  async handleWake(client: Socket, data: { userId: string; sessionId: string }) {
    const sessionData = await this.sessionStateService.onWake(data.userId, data.sessionId);
    client.emit('jarvis:session_restored', sessionData);
    this.server.emit('jarvis:state', { userId: data.userId, state: 'ACTIVE' });
  }

  @SubscribeMessage('jarvis:sleep')
  async handleSleep(client: Socket, data: { userId: string; sessionId: string; history: any[]; context: any }) {
    await this.sessionStateService.onSleep(data.userId, data.sessionId, data.history, data.context);
    this.server.emit('jarvis:state', { userId: data.userId, state: 'DORMANT' });
  }

  sendAlert(userId: string, alert: any) {
    // In a real app, we'd emit to a room specific to the userId
    this.server.emit('proactive-alert', alert);
  }

  streamJarvisResponse(chunk: string) {
    this.server.emit('jarvis-stream', chunk);
  }
}
