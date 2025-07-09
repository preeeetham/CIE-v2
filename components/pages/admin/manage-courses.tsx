"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Plus, Trash2, BookOpen, Calendar, Users, RefreshCw, List, X, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

interface CourseUnit {
  id?: string
  unit_number: number
  unit_name: string
  unit_description: string
  assignment_count: number
  hours_per_unit: number
}

interface Course {
  id: string
  course_code: string
  course_name: string
  course_description: string
  course_start_date: string
  course_end_date: string
  course_enrollments: string[]
  created_by: string
  created_date: string
  modified_by?: string
  modified_date: string
  course_units: CourseUnit[]
  creator?: {
    id: string
    name: string
    email: string
  }
}

interface ManageCoursesProps {
  facultyOnly?: boolean;
}

export function ManageCourses({ facultyOnly }: ManageCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUnitsSheetOpen, setIsUnitsSheetOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const [newCourse, setNewCourse] = useState({
    course_code: "",
    course_name: "",
    course_description: "",
    course_start_date: "",
    course_end_date: "",
  })

  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([
    {
      unit_number: 1,
      unit_name: "",
      unit_description: "",
      assignment_count: 0,
      hours_per_unit: 1,
    }
  ])

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [editCourseUnits, setEditCourseUnits] = useState<CourseUnit[]>([])
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/courses", {
        headers: {
          "x-user-id": user?.id || "",
        },
      })
      const data = await response.json()
      let loadedCourses = data.courses || [];
      if (facultyOnly && user?.id) {
        loadedCourses = loadedCourses.filter((course: Course) => course.created_by === user.id)
      }
      setCourses(loadedCourses)
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.creator?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddCourse = async () => {
    if (!newCourse.course_code || !newCourse.course_name || !newCourse.course_description || !newCourse.course_start_date || !newCourse.course_end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate dates
    const startDate = new Date(newCourse.course_start_date)
    const endDate = new Date(newCourse.course_end_date)
    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    // Validate course units
    const validUnits = courseUnits.filter(unit => 
      unit.unit_name.trim() !== "" && unit.unit_description.trim() !== ""
    )

    if (validUnits.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one course unit",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          ...newCourse,
          course_units: validUnits
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCourses((prev) => [...prev, data.course])
        setNewCourse({
          course_code: "",
          course_name: "",
          course_description: "",
          course_start_date: "",
          course_end_date: "",
        })
        setCourseUnits([{
          unit_number: 1,
          unit_name: "",
          unit_description: "",
          assignment_count: 0,
          hours_per_unit: 1,
        }])
        setIsAddDialogOpen(false)

        toast({
          title: "Success",
          description: "Course added successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add course")
      }
    } catch (error) {
      console.error("Error adding course:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add course",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!user || !user.id) {
      toast({
        title: "Error",
        description: "User not authenticated. Please log in again.",
        variant: "destructive",
      })
      return
    }
    console.log('Attempting to delete course. User:', user)
    try {
      const response = await fetch(`/api/courses?id=${courseId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (response.ok) {
        setCourses((prev) => prev.filter((course) => course.id !== courseId))
        toast({
          title: "Success",
          description: "Course deleted successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete course")
      }
    } catch (error) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete course",
        variant: "destructive",
      })
    }
  }

  const handleAddUnit = () => {
    setCourseUnits(prev => [
      ...prev,
      {
        unit_number: prev.length + 1,
        unit_name: "",
        unit_description: "",
        assignment_count: 0,
        hours_per_unit: 1,
      }
    ])
  }

  const handleRemoveUnit = (index: number) => {
    if (courseUnits.length > 1) {
      setCourseUnits(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleUnitChange = (index: number, field: keyof CourseUnit, value: any) => {
    setCourseUnits(prev => prev.map((unit, i) => 
      i === index ? { ...unit, [field]: value } : unit
    ))
  }

  const openUnitsSheet = (course: Course) => {
    setSelectedCourse(course)
    setIsUnitsSheetOpen(true)
  }

  const openEditDialog = (course: Course) => {
    setEditCourse(course)
    setEditCourseUnits(course.course_units.map(unit => ({ ...unit })))
    setIsEditDialogOpen(true)
  }

  const handleEditCourse = async () => {
    if (!editCourse) return
    if (!editCourse.course_code || !editCourse.course_name || !editCourse.course_description || !editCourse.course_start_date || !editCourse.course_end_date) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }
    const startDate = new Date(editCourse.course_start_date)
    const endDate = new Date(editCourse.course_end_date)
    if (endDate <= startDate) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" })
      return
    }
    const validUnits = editCourseUnits.filter(unit => unit.unit_name.trim() !== "" && unit.unit_description.trim() !== "")
    if (validUnits.length === 0) {
      toast({ title: "Error", description: "Please add at least one course unit", variant: "destructive" })
      return
    }
    try {
      const response = await fetch("/api/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          id: editCourse.id,
          course_code: editCourse.course_code,
          course_name: editCourse.course_name,
          course_description: editCourse.course_description,
          course_start_date: editCourse.course_start_date,
          course_end_date: editCourse.course_end_date,
          course_units: validUnits,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setCourses(prev => prev.map(c => c.id === data.course.id ? data.course : c))
        setIsEditDialogOpen(false)
        setEditCourse(null)
        setEditCourseUnits([])
        toast({ title: "Success", description: "Course updated successfully" })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update course")
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update course", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading course data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
        </div>

        <div className="flex space-x-2">
          <Button onClick={fetchCourses} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
                <DialogDescription>
                  Create a new course with its units and details
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-8 flex-1 overflow-y-auto">
                {/* Course Details Section */}
                <div className="bg-gray-50 rounded-lg p-6 shadow-sm border">
                  <h3 className="text-lg font-semibold mb-4">Course Details</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <Label htmlFor="course_code">Course Code</Label>
                      <Input
                        id="course_code"
                        value={newCourse.course_code}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. CS101"
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_name">Course Name</Label>
                      <Input
                        id="course_name"
                        value={newCourse.course_name}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_name: e.target.value }))}
                        placeholder="Enter course name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_description">Course Description</Label>
                      <Textarea
                        id="course_description"
                        value={newCourse.course_description}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_description: e.target.value }))}
                        placeholder="Enter course description"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_start_date">Start Date</Label>
                      <Input
                        id="course_start_date"
                        type="date"
                        value={newCourse.course_start_date}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_end_date">End Date</Label>
                      <Input
                        id="course_end_date"
                        type="date"
                        value={newCourse.course_end_date}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                {/* Course Units Section */}
                <div className="bg-gray-50 rounded-lg p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Course Units</h3>
                  </div>
                  <div className="flex flex-col gap-6">
                    {courseUnits.map((unit, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white shadow-sm relative">
                        {courseUnits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveUnit(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="flex items-center mb-2">
                          <h4 className="font-medium text-base">Unit {unit.unit_number}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor={`unit_name_${index}`}>Unit Name</Label>
                            <Input
                              id={`unit_name_${index}`}
                              value={unit.unit_name}
                              onChange={(e) => handleUnitChange(index, 'unit_name', e.target.value)}
                              placeholder="Enter unit name"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`unit_description_${index}`}>Unit Description</Label>
                            <Textarea
                              id={`unit_description_${index}`}
                              value={unit.unit_description}
                              onChange={(e) => handleUnitChange(index, 'unit_description', e.target.value)}
                              placeholder="Enter unit description"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`hours_per_unit_${index}`}>Duration (hours)</Label>
                            <Input
                              id={`hours_per_unit_${index}`}
                              type="number"
                              min="1"
                              value={unit.hours_per_unit}
                              onChange={(e) => handleUnitChange(index, 'hours_per_unit', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`assignment_count_${index}`}>Assignments</Label>
                            <Input
                              id={`assignment_count_${index}`}
                              type="number"
                              min="0"
                              value={unit.assignment_count}
                              onChange={(e) => handleUnitChange(index, 'assignment_count', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-6"
                    onClick={handleAddUnit}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Unit
                  </Button>
                </div>
                <div className="flex justify-end space-x-2 pt-6 bg-white sticky bottom-0 z-10 mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCourse}>
                    Create Course
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Enrollments</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mb-2" />
                    <div className="text-lg font-medium text-gray-900 mb-1">No courses found</div>
                    <div className="text-gray-600">Create your first course to get started.</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course) => [
                <TableRow key={course.id} className="group">
                  <TableCell className="font-bold">
                    <button
                      className={`mr-2 focus:outline-none ${course.course_units?.length ? '' : 'opacity-50 cursor-default'}`}
                      onClick={() => course.course_units?.length && setExpandedCourseId(expandedCourseId === course.id ? null : course.id)}
                      tabIndex={course.course_units?.length ? 0 : -1}
                      aria-label={expandedCourseId === course.id ? 'Collapse units' : 'Expand units'}
                      type="button"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      {course.course_units?.length ? (
                        <span className={`inline-block transition-transform ${expandedCourseId === course.id ? 'rotate-90' : ''}`}>▶</span>
                      ) : null}
                    </button>
                    {course.course_name}
                  </TableCell>
                  <TableCell>{course.course_code}</TableCell>
                  <TableCell className="max-w-xs truncate" title={course.course_description}>{course.course_description}</TableCell>
                  <TableCell>{new Date(course.course_start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(course.course_end_date).toLocaleDateString()}</TableCell>
                  <TableCell>{course.course_units?.length || 0}</TableCell>
                  <TableCell>{course.course_enrollments?.length || 0}</TableCell>
                  <TableCell>{course.creator?.name || 'Unknown User'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEditDialog(course)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => {
                        setCourseToDelete(course)
                        setIsDeleteDialogOpen(true)
                      }}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>,
                expandedCourseId === course.id && course.course_units?.length ? (
                  <TableRow key={course.id + '-units'} className="bg-gray-50">
                    <TableCell colSpan={9} className="p-0">
                      <div className="p-4">
                        <div className="font-semibold mb-2">Units</div>
                        <Table className="border">
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Duration (hours)</TableHead>
                              <TableHead>Assignments</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {course.course_units.map((unit, idx) => (
                              <TableRow key={unit.id || idx}>
                                <TableCell>{unit.unit_number}</TableCell>
                                <TableCell>{unit.unit_name}</TableCell>
                                <TableCell className="max-w-xs truncate" title={unit.unit_description}>{unit.unit_description}</TableCell>
                                <TableCell>{unit.hours_per_unit}</TableCell>
                                <TableCell>{unit.assignment_count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null
              ])
            )}
          </TableBody>
        </Table>
      </div>

      {/* Course Units Sheet */}
      <Sheet open={isUnitsSheetOpen} onOpenChange={setIsUnitsSheetOpen}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Course Units</SheetTitle>
            <SheetDescription>
              {selectedCourse?.course_name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedCourse?.course_units?.length === 0 ? (
              <p className="text-gray-500 text-center">No units added yet</p>
            ) : (
              selectedCourse?.course_units?.map((unit) => (
                <Card key={unit.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Unit {unit.unit_number}</h4>
                      <Badge variant="outline">{unit.hours_per_unit}h</Badge>
                    </div>
                    <h5 className="font-medium text-sm">{unit.unit_name}</h5>
                    <p className="text-sm text-gray-600">{unit.unit_description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{unit.assignment_count} assignments</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and units
            </DialogDescription>
          </DialogHeader>
          {editCourse && (
            <div className="flex flex-col gap-8 flex-1 overflow-y-auto">
              {/* Course Details Section */}
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Course Details</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <Label htmlFor="edit_course_code">Course Code</Label>
                    <Input
                      id="edit_course_code"
                      value={editCourse.course_code}
                      onChange={e => setEditCourse(prev => prev ? { ...prev, course_code: e.target.value.toUpperCase() } : prev)}
                      maxLength={16}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_course_name">Course Name</Label>
                    <Input
                      id="edit_course_name"
                      value={editCourse.course_name}
                      onChange={e => setEditCourse(prev => prev ? { ...prev, course_name: e.target.value } : prev)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_course_description">Course Description</Label>
                    <Textarea
                      id="edit_course_description"
                      value={editCourse.course_description}
                      onChange={e => setEditCourse(prev => prev ? { ...prev, course_description: e.target.value } : prev)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_course_start_date">Start Date</Label>
                    <Input
                      id="edit_course_start_date"
                      type="date"
                      value={editCourse.course_start_date}
                      onChange={e => setEditCourse(prev => prev ? { ...prev, course_start_date: e.target.value } : prev)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_course_end_date">End Date</Label>
                    <Input
                      id="edit_course_end_date"
                      type="date"
                      value={editCourse.course_end_date}
                      onChange={e => setEditCourse(prev => prev ? { ...prev, course_end_date: e.target.value } : prev)}
                    />
                  </div>
                </div>
              </div>
              {/* Course Units Section */}
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Course Units</h3>
                </div>
                <div className="flex flex-col gap-6">
                  {editCourseUnits.map((unit, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white shadow-sm relative">
                      {editCourseUnits.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => setEditCourseUnits(prev => prev.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="flex items-center mb-2">
                        <h4 className="font-medium text-base">Unit {unit.unit_number}</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor={`edit_unit_name_${index}`}>Unit Name</Label>
                          <Input id={`edit_unit_name_${index}`} value={unit.unit_name} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, unit_name: e.target.value } : u))} />
                        </div>
                        <div>
                          <Label htmlFor={`edit_unit_description_${index}`}>Unit Description</Label>
                          <Textarea id={`edit_unit_description_${index}`} value={unit.unit_description} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, unit_description: e.target.value } : u))} rows={2} />
                        </div>
                        <div>
                          <Label htmlFor={`edit_hours_per_unit_${index}`}>Duration (hours)</Label>
                          <Input id={`edit_hours_per_unit_${index}`} type="number" min="1" value={unit.hours_per_unit} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, hours_per_unit: parseInt(e.target.value) || 1 } : u))} />
                        </div>
                        <div>
                          <Label htmlFor={`edit_assignment_count_${index}`}>Assignments</Label>
                          <Input id={`edit_assignment_count_${index}`} type="number" min="0" value={unit.assignment_count} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, assignment_count: parseInt(e.target.value) || 0 } : u))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-6"
                  onClick={() => setEditCourseUnits(prev => [...prev, { unit_number: prev.length + 1, unit_name: "", unit_description: "", assignment_count: 0, hours_per_unit: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Unit
                </Button>
              </div>
              <div className="flex justify-end space-x-2 pt-6 bg-white sticky bottom-0 z-10 mt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleEditCourse}>Update Course</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course?
            </DialogDescription>
          </DialogHeader>
          {courseToDelete && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Course Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="delete_course_code">Course Code</Label>
                      <Input
                        id="delete_course_code"
                        value={courseToDelete.course_code}
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="delete_course_name">Course Name</Label>
                      <Input
                        id="delete_course_name"
                        value={courseToDelete.course_name}
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="delete_course_description">Course Description</Label>
                      <Textarea
                        id="delete_course_description"
                        value={courseToDelete.course_description}
                        disabled
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delete_course_start_date">Start Date</Label>
                        <Input
                          id="delete_course_start_date"
                          type="date"
                          value={courseToDelete.course_start_date}
                          disabled
                        />
                      </div>
                      <div>
                        <Label htmlFor="delete_course_end_date">End Date</Label>
                        <Input
                          id="delete_course_end_date"
                          type="date"
                          value={courseToDelete.course_end_date}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  handleDeleteCourse(courseToDelete.id)
                  setIsDeleteDialogOpen(false)
                }}>Delete Course</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

