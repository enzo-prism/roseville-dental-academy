export type CourseScheduleId =
  | "bls-cpr-1"
  | "coronal-polish"
  | "dental-assisting-program"
  | "infection-control"
  | "radiation-safety"
  | "sealants";

export type CourseScheduleStatus = "available" | "full";

export type CourseScheduleCourse = {
  id: CourseScheduleId;
  label: string;
  status?: CourseScheduleStatus;
};

export type CourseScheduleEntry = {
  courses: CourseScheduleCourse[];
  date: string;
  day: string;
  isoDate: string;
};

export type CourseScheduleMonth = {
  entries: CourseScheduleEntry[];
  month: string;
};

export const courseScheduleNote =
  "Dates are penciled in and may change; admissions will confirm current availability.";

export const courseScheduleCourseDetails: Record<
  CourseScheduleId,
  {
    href: string;
    label: string;
    shortLabel: string;
  }
> = {
  "bls-cpr-1": {
    href: "/bls%2Fcpr-1",
    label: "BLS / CPR",
    shortLabel: "BLS",
  },
  "coronal-polish": {
    href: "/coronal-polish",
    label: "Coronal Polish",
    shortLabel: "Coronal",
  },
  "dental-assisting-program": {
    href: "/dental-assisting-program",
    label: "Dental Assisting Training",
    shortLabel: "Dental Assisting",
  },
  "infection-control": {
    href: "/infection-control",
    label: "Infection Control",
    shortLabel: "Infection Control",
  },
  "radiation-safety": {
    href: "/radiation-safety",
    label: "X-rays / Radiation Safety",
    shortLabel: "X-rays",
  },
  sealants: {
    href: "/sealants",
    label: "Pit and Fissure Sealants",
    shortLabel: "Sealants",
  },
};

function course(id: CourseScheduleId, status?: CourseScheduleStatus): CourseScheduleCourse {
  return {
    id,
    label: courseScheduleCourseDetails[id].label,
    status,
  };
}

const blsXrayInfectionCourses = [
  course("bls-cpr-1"),
  course("radiation-safety"),
  course("infection-control"),
] satisfies CourseScheduleCourse[];

// June 6, 2026: BLS, X-rays, and Infection Control are all fully booked.
const juneSixFullCourses = [
  course("bls-cpr-1", "full"),
  course("radiation-safety", "full"),
  course("infection-control", "full"),
] satisfies CourseScheduleCourse[];

const coronalSealantsCourses = [
  course("coronal-polish"),
  course("sealants"),
] satisfies CourseScheduleCourse[];

// June 20, 2026: Coronal Polish and Pit and Fissure Sealants are fully booked.
const juneTwentyCourses = [
  course("coronal-polish", "full"),
  course("sealants", "full"),
] satisfies CourseScheduleCourse[];

// July 25, 2026: Coronal Polish and Pit and Fissure Sealants are fully booked.
const julyTwentyFiveCourses = [
  course("coronal-polish", "full"),
  course("sealants", "full"),
] satisfies CourseScheduleCourse[];

export const courseScheduleMonths = [
  {
    month: "June",
    entries: [
      {
        date: "June 6, 2026",
        day: "June 6",
        isoDate: "2026-06-06",
        courses: juneSixFullCourses,
      },
      {
        date: "June 19, 2026",
        day: "June 19",
        isoDate: "2026-06-19",
        courses: [course("dental-assisting-program", "full")],
      },
      {
        date: "June 20, 2026",
        day: "June 20",
        isoDate: "2026-06-20",
        courses: juneTwentyCourses,
      },
    ],
  },
  {
    month: "July",
    entries: [
      {
        date: "July 13, 2026",
        day: "July 13",
        isoDate: "2026-07-13",
        courses: [course("dental-assisting-program", "full")],
      },
      {
        date: "July 18, 2026",
        day: "July 18",
        isoDate: "2026-07-18",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "July 25, 2026",
        day: "July 25",
        isoDate: "2026-07-25",
        courses: julyTwentyFiveCourses,
      },
    ],
  },
  {
    month: "August",
    entries: [
      {
        date: "August 1, 2026",
        day: "August 1",
        isoDate: "2026-08-01",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "August 8, 2026",
        day: "August 8",
        isoDate: "2026-08-08",
        courses: coronalSealantsCourses,
      },
    ],
  },
  {
    month: "September",
    entries: [
      {
        date: "September 4, 2026",
        day: "September 4",
        isoDate: "2026-09-04",
        courses: [course("dental-assisting-program")],
      },
      {
        date: "September 5, 2026",
        day: "September 5",
        isoDate: "2026-09-05",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "September 12, 2026",
        day: "September 12",
        isoDate: "2026-09-12",
        courses: coronalSealantsCourses,
      },
    ],
  },
  {
    month: "October",
    entries: [
      {
        date: "October 3, 2026",
        day: "October 3",
        isoDate: "2026-10-03",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "October 5, 2026",
        day: "October 5",
        isoDate: "2026-10-05",
        courses: [course("dental-assisting-program")],
      },
      {
        date: "October 10, 2026",
        day: "October 10",
        isoDate: "2026-10-10",
        courses: coronalSealantsCourses,
      },
    ],
  },
  {
    month: "November",
    entries: [
      {
        date: "November 7, 2026",
        day: "November 7",
        isoDate: "2026-11-07",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "November 14, 2026",
        day: "November 14",
        isoDate: "2026-11-14",
        courses: coronalSealantsCourses,
      },
      {
        date: "November 20, 2026",
        day: "November 20",
        isoDate: "2026-11-20",
        courses: [course("dental-assisting-program")],
      },
    ],
  },
  {
    month: "December",
    entries: [
      {
        date: "December 5, 2026",
        day: "December 5",
        isoDate: "2026-12-05",
        courses: blsXrayInfectionCourses,
      },
      {
        date: "December 12, 2026",
        day: "December 12",
        isoDate: "2026-12-12",
        courses: coronalSealantsCourses,
      },
    ],
  },
] satisfies CourseScheduleMonth[];

export const courseScheduleEntries = courseScheduleMonths.flatMap((month) =>
  month.entries.map((entry) => ({
    ...entry,
    month: month.month,
  })),
);

export function getCourseSchedule(courseId: CourseScheduleId) {
  return courseScheduleEntries
    .filter((entry) => entry.courses.some((item) => item.id === courseId))
    .map((entry) => {
      const course = entry.courses.find((item) => item.id === courseId);

      return {
        ...entry,
        course,
        status: course?.status ?? "available",
      };
    });
}

export function getNextAvailableCourseDate(courseId: CourseScheduleId) {
  return getCourseSchedule(courseId).find((entry) => entry.status !== "full")?.date;
}

export function getCourseScheduleDateList(courseId: CourseScheduleId) {
  return getCourseSchedule(courseId)
    .map((entry) => (entry.status === "full" ? `${entry.date} (Full)` : entry.date))
    .join("; ");
}
