import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // For now, we'll allow access without authentication
    // In a real app, you'd implement proper session checking here
    
    const searchParams = request.nextUrl.searchParams
    const facultyId = searchParams.get("facultyId")
    const courseId = searchParams.get("courseId")
    const studentId = searchParams.get("studentId")

    let schedules

    if (facultyId) {
      // Get schedules for a specific faculty
      schedules = await prisma.classSchedule.findMany({
        where: { facultyId },
        include: {
          course: true,
          faculty: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    } else if (courseId) {
      // Get schedules for a specific course
      schedules = await prisma.classSchedule.findMany({
        where: { courseId },
        include: {
          course: true,
          faculty: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    } else if (studentId) {
      // Get schedules for a specific student based on their enrollments
      const studentEnrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true, section: true },
      })

      const enrollmentFilters = studentEnrollments.map((enrollment) => ({
        courseId: enrollment.courseId,
        section: enrollment.section,
      }))

      schedules = await prisma.classSchedule.findMany({
        where: {
          OR: enrollmentFilters,
        },
        include: {
          course: true,
          faculty: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    } else {
      // Get all schedules (admin view)
      schedules = await prisma.classSchedule.findMany({
        include: {
          course: true,
          faculty: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    }

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error("Get class schedules error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, we'll allow access without authentication
    // In a real app, you'd implement proper session checking here
    
    const data = await request.json()

    const schedule = await prisma.classSchedule.create({
      data: {
        courseId: data.courseId,
        facultyId: data.facultyId,
        room: data.room,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        section: data.section,
      },
      include: {
        course: true,
        faculty: {
          include: {
            user: true,
          },
        },
      },
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Create class schedule error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
