
export interface RequestBody {
	start_day_identifier: string
	timezone_identifier: string
	service_duration: number
	days?: number
	timeslot_interval?: number
	is_ignore_schedule?: boolean
	is_ignore_workhour?: boolean
}

export type ResponseBody = DayTimetable[]

export interface DayTimetable {
  start_of_day: number // Unixstamp seconds
  day_modifier: number
  is_day_off: boolean
  timeslots: Timeslot[]
}

export interface Timeslot {
  begin_at: number // Unixstamp seconds
  end_at: number // Unixstamp seconds
}

export type WorkHours = Schedule[]

export interface Schedule {
  weekday?: number
  key?: string
  is_day_off: boolean
  open_interval: number
  close_interval: number
}

export type Events = Reservation[]

interface Reservation {
  begin_at: number
  end_at: number
  created_at: number
  updated_at: number  
} 