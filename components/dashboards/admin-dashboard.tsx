"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, Users, BookOpen, Wrench, MapPin, Calendar } from "lucide-react"
import { AdminHome } from "@/components/pages/admin/admin-home"
import { ManageFaculty } from "@/components/pages/admin/manage-faculty"
import { ManageStudents } from "@/components/pages/admin/manage-students"
import { ManageCourses } from "@/components/pages/admin/manage-courses"
import { ManageLabComponents } from "@/components/pages/admin/manage-lab-components"
import { ManageLocations } from "@/components/pages/admin/manage-locations"
import { ManageClassSchedules } from "@/components/pages/admin/manage-class-schedules"

const menuItems = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "faculty", label: "Faculty", icon: Users },
  { id: "students", label: "Students", icon: Users },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "schedules", label: "Class Schedules", icon: Calendar },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "lab-components", label: "Lab Components", icon: Wrench },
]

export function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState("home")

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <AdminHome onPageChange={setCurrentPage} />
      case "faculty":
        return <ManageFaculty />
      case "students":
        return <ManageStudents />
      case "courses":
        return <ManageCourses />
      case "schedules":
        return <ManageClassSchedules />
      case "locations":
        return <ManageLocations />
      case "lab-components":
        return <ManageLabComponents />
      default:
        return <AdminHome onPageChange={setCurrentPage} />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage} menuItems={menuItems}>
      {renderPage()}
    </DashboardLayout>
  )
}
