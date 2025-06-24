"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, Clock, MapPin, Trash2, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/components/auth-provider"

interface Course {
  course_id: string
  course_name: string
  course_description: string
  course_start_date: string
  course_end_date: string
  course_enrollments: string[]
  created_by: string
  created_date: string
  modified_by?: string
  modified_date: string
}

interface Faculty {
  id: string
  user: {
    name: string
    email: string
  }
  department: string
}

interface ClassSchedule {
  id: string
  courseId: string
  course: {
    course_id: string
    course_name: string
  }
  facultyId: string
  faculty: {
    user: {
      name: string
      email: string
    }
  }
  room: string
  dayOfWeek: string
  startTime: string
  endTime: string
  section: string
}

export function ManageClassSchedules() {
  const [courses, setCourses] = useState<Course[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentDay, setCurrentDay] = useState<string>("all")
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const [newSchedule, setNewSchedule] = useState({
    courseId: "",
    facultyId: "",
    room: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    section: "",
  })

  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null)

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch courses
        const coursesResponse = await fetch("/api/courses", {
          headers: {
            "x-user-id": user?.id || "",
          },
        })
        const coursesData = await coursesResponse.json()
        setCourses(coursesData.courses || [])

        // Fetch faculty
        const facultyResponse = await fetch("/api/faculty")
        const facultyData = await facultyResponse.json()
        setFaculty(facultyData.faculty || [])

        // Fetch schedules
        const schedulesResponse = await fetch("/api/class-schedules")
        const schedulesData = await schedulesResponse.json()
        setSchedules(schedulesData.schedules || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast, user])

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch =
      schedule.course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.faculty.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.room.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDay = currentDay === "all" || schedule.dayOfWeek === currentDay

    return matchesSearch && matchesDay
  })

  const handleAddSchedule = async () => {
    if (
      !newSchedule.courseId ||
      !newSchedule.facultyId ||
      !newSchedule.room ||
      !newSchedule.dayOfWeek ||
      !newSchedule.startTime ||
      !newSchedule.endTime ||
      !newSchedule.section
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/class-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify(newSchedule),
      })

      if (!response.ok) {
        throw new Error("Failed to add schedule")
      }

      const data = await response.json()
      setSchedules((prev) => [...prev, data.schedule])
      setNewSchedule({
        courseId: "",
        facultyId: "",
        room: "",
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        section: "",
      })
      setIsAddDialogOpen(false)

      toast({
        title: "Success",
        description: "Class schedule added successfully",
      })
    } catch (error) {
      console.error("Error adding schedule:", error)
      toast({
        title: "Error",
        description: "Failed to add schedule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditSchedule = async () => {
    if (!editingSchedule) return

    try {
      const response = await fetch(`/api/class-schedules/${editingSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          courseId: editingSchedule.courseId,
          facultyId: editingSchedule.facultyId,
          room: editingSchedule.room,
          dayOfWeek: editingSchedule.dayOfWeek,
          startTime: editingSchedule.startTime,
          endTime: editingSchedule.endTime,
          section: editingSchedule.section,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update schedule")
      }

      const data = await response.json()
      setSchedules((prev) =>
        prev.map((schedule) => (schedule.id === editingSchedule.id ? data.schedule : schedule))
      )
      setEditingSchedule(null)
      setIsEditDialogOpen(false)

      toast({
        title: "Success",
        description: "Class schedule updated successfully",
      })
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return

    try {
      const response = await fetch(`/api/class-schedules/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete schedule")
      }

      setSchedules((prev) => prev.filter((schedule) => schedule.id !== id))
      toast({
        title: "Success",
        description: "Class schedule deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting schedule:", error)
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getAvailableSections = (courseId: string) => {
    const course = courses.find((c) => c.course_id === courseId)
    return course ? ["A", "B", "C", "D"] : []
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading class schedules...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Schedule Management</h1>
          <p className="text-gray-600 mt-2">Manage class schedules and timetables</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Class Schedule</DialogTitle>
              <DialogDescription>
                Create a new class schedule entry for students and faculty.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select onValueChange={(value) => setNewSchedule((prev) => ({ ...prev, courseId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.course_id} value={course.course_id}>
                          {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faculty">Faculty *</Label>
                  <Select onValueChange={(value) => setNewSchedule((prev) => ({ ...prev, facultyId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.user.name} ({f.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room">Room *</Label>
                  <Input
                    id="room"
                    value={newSchedule.room}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, room: e.target.value }))}
                    placeholder="Room 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Select onValueChange={(value) => setNewSchedule((prev) => ({ ...prev, section: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSections(newSchedule.courseId).map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day *</Label>
                  <Select onValueChange={(value) => setNewSchedule((prev) => ({ ...prev, dayOfWeek: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSchedule}>Add Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search schedules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={currentDay} onValueChange={setCurrentDay}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {daysOfWeek.map((day) => (
              <SelectItem key={day} value={day}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4">
            {filteredSchedules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
                  <p className="text-gray-600">Add your first class schedule to get started.</p>
                </CardContent>
              </Card>
            ) : (
              filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5" />
                          <span>{schedule.course.course_name}</span>
                        </CardTitle>
                        <CardDescription>
                          {schedule.faculty.user.name} • {schedule.room} • Section {schedule.section}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSchedule(schedule)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{schedule.dayOfWeek}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="space-y-2">
                <h3 className="font-medium text-center text-sm">{day}</h3>
                <div className="space-y-1">
                  {schedules
                    .filter((schedule) => schedule.dayOfWeek === day)
                    .map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-2 bg-blue-100 rounded text-xs hover:bg-blue-200 cursor-pointer"
                      >
                        <div className="font-medium">{schedule.course.course_name}</div>
                        <div className="text-gray-600">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </div>
                        <div className="text-gray-500">{schedule.room}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Class Schedule</DialogTitle>
            <DialogDescription>
              Update the class schedule details.
            </DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-course">Course *</Label>
                  <Select
                    value={editingSchedule.courseId}
                    onValueChange={(value) =>
                      setEditingSchedule((prev) => prev ? { ...prev, courseId: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.course_id} value={course.course_id}>
                          {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-faculty">Faculty *</Label>
                  <Select
                    value={editingSchedule.facultyId}
                    onValueChange={(value) =>
                      setEditingSchedule((prev) => prev ? { ...prev, facultyId: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.user.name} ({f.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room">Room *</Label>
                  <Input
                    id="edit-room"
                    value={editingSchedule.room}
                    onChange={(e) =>
                      setEditingSchedule((prev) => prev ? { ...prev, room: e.target.value } : null)
                    }
                    placeholder="Room 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-section">Section *</Label>
                  <Select
                    value={editingSchedule.section}
                    onValueChange={(value) =>
                      setEditingSchedule((prev) => prev ? { ...prev, section: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSections(editingSchedule.courseId).map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dayOfWeek">Day *</Label>
                  <Select
                    value={editingSchedule.dayOfWeek}
                    onValueChange={(value) =>
                      setEditingSchedule((prev) => prev ? { ...prev, dayOfWeek: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-startTime">Start Time *</Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={editingSchedule.startTime}
                    onChange={(e) =>
                      setEditingSchedule((prev) => prev ? { ...prev, startTime: e.target.value } : null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-endTime">End Time *</Label>
                  <Input
                    id="edit-endTime"
                    type="time"
                    value={editingSchedule.endTime}
                    onChange={(e) =>
                      setEditingSchedule((prev) => prev ? { ...prev, endTime: e.target.value } : null)
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSchedule}>Update Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
