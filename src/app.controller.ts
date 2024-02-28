import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { RequestBody, ResponseBody } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('getTimeSlots')
  async getTimeSlots(@Body() body: RequestBody): Promise<ResponseBody> {
    return await this.appService.getDayTimetables(body);
  }
}
