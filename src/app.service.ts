import { Injectable } from '@nestjs/common';
import { RequestBody, ResponseBody, DayTimetable, Timeslot, Events, WorkHours, Schedule } from './types';
import { ErrorMessage } from './error';

import eventsData from './events.json';
import workhoursData from './workhours.json';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(timezone);
dayjs.extend(utc);

@Injectable()
export class AppService {
  async getDayTimetables(body: RequestBody): Promise<ResponseBody> {
    const { start_day_identifier, timezone_identifier, service_duration } = body;
    // nullable 변수 default 값 지정
    const days = body.days ? body.days : 1;
    const timeslot_interval = body.timeslot_interval ? body.timeslot_interval : 1800;
    const is_ignore_schedule = body.is_ignore_schedule ? true : false;
    const is_ignore_workhour = body.is_ignore_workhour ? true : false;

    // ignore 여부 반영한 예약, 영업시간 정보
    const events = is_ignore_schedule ? [] : eventsData;
    const workhours = is_ignore_workhour ? null : workhoursData;
    
    if (days > 90) {
      throw new Error(ErrorMessage.ReservationNotPossibleThatTooFar);
    }

    // 시작일의 Unixstamp
    const start_of_entire_day = this.toUnixstampDate(start_day_identifier, timezone_identifier);

    // 각 날짜의 시작 시간(start_of_day)를 담은 배열
    const start_time_of_each_day = this.getStartTimeOfEachDay(start_of_entire_day, days);

    // 영업시간과 예약내역 정보를 바탕으로 결과값 구하기
    return start_time_of_each_day.map((el) => {
      return this.getDayTimeTable(el, timeslot_interval, service_duration, events, workhours);
    });
  }

  // YYYYMMDD 형식의 날짜를 tz에 맞는 Unixstamp number로 변환
  toUnixstampDate(date: string, timezone_identifier: string): number {
    const tzTime = dayjs.tz(date, 'YYYYMMDD', timezone_identifier).utc().format('YYYYMMDDHHmmss');
    return dayjs(tzTime, 'YYYYMMDDHHmmss').unix();
  }

  // Unixstamp 날짜 정보에서 요일 정보를 추출
  toDayOfTheWeek(unixstamp: number): number {
    return dayjs.unix(unixstamp).day() + 1;
  }

  // 선택 가능한 날짜 중 시작 시간을 담은 배열
  getStartTimeOfEachDay(start_of_entire_day: number, days: number): DayTimetable[] {
    const schedule = [];
    for (let i=1; i<=days; i++) {
      schedule.push({
        start_of_day: start_of_entire_day + (86400 * (i)),
        day_modifier: i
      });
    }
    return schedule;
  }

  // 결과 리턴
  getDayTimeTable(start_time: DayTimetable, timeslot_interval: number, service_duration: number, events: Events, workhours: WorkHours): DayTimetable {
    // 선택된 날의 요일 정보
    const target = this.toDayOfTheWeek(start_time.start_of_day);
    // 선택된 날에 대한 영업시간 구하기
    const default_workhours = {
      open_interval: 0,
      close_interval: 86400,
      is_day_off: false
    };
    const schedule_for_the_day = workhours ? workhours.find(day => day.weekday === target) : default_workhours;
    // 휴일 값을 지정한 경우와 오픈, 마감 시간의 설정을 통한 휴일 모두 체크
    let is_day_off = workhours && (schedule_for_the_day.is_day_off || schedule_for_the_day.open_interval >= schedule_for_the_day.close_interval) ? true : false;

    // 쉬는 날엔 로직 타지 않게끔 빈 배열 할당
    const timeslots = !is_day_off ? this.getTimeslots(start_time, timeslot_interval, service_duration, schedule_for_the_day, events) : [];

    return {
      ...start_time,
      is_day_off,
      timeslots
    };
  }

  // 가능한 timetable 조회
  getTimeslots(start_time: DayTimetable, timeslot_interval: number, service_duration: number, schedule_for_the_day: Schedule, events: Events): Timeslot[] {
    const timeslots: Timeslot[] = [];
    // 영업시작 시간
    const start_of_schedule = start_time.start_of_day + schedule_for_the_day.open_interval;
    // 영업종료 시간
    const end_of_schedule = start_time.start_of_day + schedule_for_the_day.close_interval;

    // 예약시간 데이터 필터링
    const filtered_events = events.filter((el) => (el.begin_at >= start_of_schedule && el.begin_at <= end_of_schedule) || (el.end_at >= start_of_schedule && el.end_at <= end_of_schedule));

    let current_time = start_of_schedule;
    while(current_time + service_duration <= end_of_schedule) {
      // 이미 예약된 내역 중 하나라도 겹치는 조건이 있으면 timeslots에 넣을 수 없음
      const is_available = !filtered_events.some(event => {
        // 예약의 시작 시간이 다른 예약의 끝 시간과 겹쳐도 되고
        // 예약의 끝 시간이 다른 예약의 시작 시간과 겹쳐도 되게끔
        return (current_time >= event.begin_at && current_time < event.end_at) || (current_time + service_duration > event.begin_at && current_time + service_duration <= event.end_at);
      });

      if (is_available) {
        timeslots.push({
          begin_at: current_time,
          end_at: current_time + service_duration
        });
      }
      current_time += timeslot_interval;
    }
    return timeslots;
  }
}
