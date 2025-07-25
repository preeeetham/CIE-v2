import React from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, BookOpen, Users, Calendar, BadgeIcon as IdCard, User as UserIcon, Camera, FilePlus, FileText, Download, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BaseProfile {
  name: string;
  email: string;
  id: string;
  phone?: string;
  join_date?: string;
  role: 'admin' | 'faculty' | 'student' | string;
}

interface AdminProfile extends BaseProfile {
  role: 'admin';
  department: string;
  office: string;
  permissions: string[];
  working_hours: string;
}

interface FacultyProfile extends BaseProfile {
  role: 'faculty';
  department: string;
  office: string;
  assigned_courses: string[];
  specialization: string;
  office_hours: string;
}

interface StudentProfile extends BaseProfile {
  role: 'student';
  student_id: string;
  program: string;
  year: string;
  section: string;
  gpa: string;
  advisor: string;
}

type ProfileData = AdminProfile | FacultyProfile | StudentProfile;

function buildProfileData(user: any): ProfileData | null {
  if (!user) return null;
  
  const baseData: Omit<BaseProfile, 'role'> = {
    name: user.name || 'Unknown User',
    email: user.email || '',
    id: user.id || '',
    phone: user.phone,
    join_date: user.join_date,
  };
  switch (user.role?.toLowerCase()) {
    case "admin":
      return {
        ...baseData,
        role: "admin" as const,
        department: "Administration",
        office: "Admin Building, Room 101",
        permissions: [
          "Full System Access",
          "User Management",
          "System Configuration",
        ],
        working_hours: "9:00 AM - 5:00 PM",
      };
    case "faculty":
      return {
        ...baseData,
        role: "faculty" as const,
        department: "Computer Science",
        office: "Engineering Building, Room 205",
        assigned_courses: [
          "CS101 - Intro to Programming",
          "CS201 - Data Structures",
          "CS301 - Algorithms",
        ],
        specialization: "Software Engineering",
        office_hours: "Mon-Wed-Fri: 2:00 PM - 4:00 PM",
      };
    case "student":
      return {
        ...baseData,
        role: "student" as const,
        student_id: "STU2024001",
        program: "Bachelor of Computer Science",
        year: "3rd Year",
        section: "Section A",
        gpa: "3.85",
        advisor: "Dr. John Smith",
      };
    default:
      return null;
  }
}

function isAdminProfile(data: ProfileData): data is AdminProfile {
  return data?.role === "admin";
}
function isFacultyProfile(data: ProfileData): data is FacultyProfile {
  return data?.role === "faculty";
}
function isStudentProfile(data: ProfileData): data is StudentProfile {
  return data?.role === "student";
}

const ProfileRow: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <tr className="border-b border-gray-200 last:border-b-0">
    <th className="text-left font-medium text-gray-500 p-4 flex items-center gap-3 w-1/3">
      {Icon && <Icon className="h-5 w-5 text-blue-400" />}
      <span>{label}</span>
    </th>
    <td className="p-4 text-gray-800 font-medium">{value}</td>
  </tr>
);

export function UserProfile() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const resumeInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [resumeName, setResumeName] = React.useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = React.useState<string | null>(null);
  const [isUploadingResume, setIsUploadingResume] = React.useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const profile = React.useMemo(() => buildProfileData(user), [user]);

  // Load existing resume info on component mount
  React.useEffect(() => {
    if (user?.profileData?.resume_id) {
      setResumeName(user.profileData.resume_id);
      setResumeUrl(`/resumes/${user.profileData.resume_id}`);
    }
  }, [user]);

  const handleResumeUpload = async (file: File) => {
    if (!user) return;

    setIsUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const endpoint = user.role === 'FACULTY' ? '/api/faculty/upload-resume' : '/api/student/upload-resume';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setResumeName(data.resumeId);
        setResumeUrl(data.resumeUrl);
        toast({
          title: "Success",
          description: "Resume uploaded successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Resume upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!user) return;

    try {
      const endpoint = user.role === 'FACULTY' ? '/api/faculty/upload-resume' : '/api/student/upload-resume';
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      });

      if (response.ok) {
        setResumeName(null);
        setResumeUrl(null);
        toast({
          title: "Success",
          description: "Resume deleted successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Resume delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-lg">No user data available.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <Card className="bg-gradient-to-br from-white via-gray-50 to-blue-50 shadow-xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-col items-center gap-4 pb-0">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-blue-200 shadow-lg rounded-full">
              <AvatarImage 
                src={previewImage || (user?.role === 'FACULTY' && user?.profileData?.faculty_id ? `/profile-img/${user.profileData.faculty_id}.jpg` : user?.image) || undefined} 
                alt={user?.name || 'User avatar'}
                onError={(e) => {
                  // Try different extensions if jpg fails
                  const currentSrc = e.currentTarget.src;
                  if (currentSrc.includes('.jpg') && !previewImage) {
                    e.currentTarget.src = currentSrc.replace('.jpg', '.jpeg');
                  } else if (currentSrc.includes('.jpeg') && !previewImage) {
                    e.currentTarget.src = currentSrc.replace('.jpeg', '.png');
                  }
                }}
              />
              <AvatarFallback className="text-4xl font-bold bg-blue-100 text-blue-700">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {/* upload overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 bg-white border border-blue-100 rounded-full p-2 shadow-md hover:bg-blue-50 transition"
              title="Change avatar"
            >
              <Camera className="h-5 w-5 text-blue-600" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e)=>{
                const file = e.target.files?.[0];
                if(file && user){
                  const url = URL.createObjectURL(file);
                  setPreviewImage(url);
                  
                  // Upload the image if user is faculty
                  if (user.role === 'FACULTY' && user.profileData?.id) {
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('facultyId', user.profileData.id);
                      
                      const response = await fetch('/api/faculty/upload', {
                        method: 'POST',
                        body: formData,
                      });
                      
                      if (response.ok) {
                        toast({
                          title: "Success",
                          description: "Profile image updated successfully",
                        });
                      } else {
                        throw new Error('Upload failed');
                      }
                    } catch (error) {
                      console.error('Image upload error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to upload profile image",
                        variant: "destructive",
                      });
                      setPreviewImage(null);
                    }
                  }
                }
              }}
            />
          </div>
          <div className="text-center mt-2">
            <CardTitle className="text-2xl font-bold text-blue-800">{profile.name}</CardTitle>
            <CardDescription className="mt-1 text-blue-500 font-medium tracking-wide">
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-8 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <tbody>
                <ProfileRow label="Email" icon={Mail} value={<a href={`mailto:${profile.email}`} className="hover:underline text-blue-600">{profile.email}</a>} />
                {profile.phone && <ProfileRow label="Phone" icon={Phone} value={<a href={`tel:${profile.phone}`} className="hover:underline text-blue-600">{profile.phone}</a>} />}
                
                {/* Role-specific rows */}
                {isAdminProfile(profile) && (
                  <>
                    <ProfileRow label="Office" icon={MapPin} value={profile.office} />
                    <ProfileRow label="Permissions" icon={UserIcon} value={
                      <div className="flex flex-wrap gap-2">
                        {profile.permissions.map((p) => (
                          <span key={p} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-semibold">{p}</span>
                        ))}
                      </div>
                    } />
                  </>
                )}

                {isFacultyProfile(profile) && (
                    <>
                        <ProfileRow label="Department" icon={BookOpen} value={profile.department} />
                        <ProfileRow label="Office" icon={MapPin} value={profile.office} />
                        <ProfileRow label="Office Hours" icon={Calendar} value={profile.office_hours} />
                        <ProfileRow label="Assigned Courses" icon={Users} value={
                            <div className="flex flex-wrap gap-2">
                                {profile.assigned_courses.map((c) => (
                                    <span key={c} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md font-semibold">{c}</span>
                                ))}
                            </div>
                        } />
                    </>
                )}

                {isStudentProfile(profile) && (
                    <>
                        <ProfileRow label="Program" icon={BookOpen} value={profile.program} />
                        <ProfileRow label="Year & Section" icon={Users} value={`${profile.year} - ${profile.section}`} />
                        <ProfileRow label="Advisor" icon={UserIcon} value={profile.advisor} />
                        <ProfileRow label="GPA" icon={IdCard} value={profile.gpa} />
                    </>
                )}
              </tbody>
            </table>
          </div>

          {/* Resume upload section (faculty and students only) */}
          {(user?.role === 'FACULTY' || user?.role === 'STUDENT') && (
            <>
              <Separator className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Resume</p>
                      {resumeName ? (
                        <p className="text-sm text-muted-foreground">
                          {resumeName.length > 50 ? `${resumeName.substring(0, 50)}...` : resumeName}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No resume uploaded</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resumeUrl && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.open(resumeUrl, '_blank')}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> 
                        View
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={isUploadingResume}
                      onClick={() => resumeInputRef.current?.click()}
                      className="flex items-center gap-1"
                    >
                      <FilePlus className="h-3 w-3" /> 
                      {isUploadingResume ? 'Uploading...' : 'Upload'}
                    </Button>
                    {resumeName && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleResumeDelete}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" /> 
                        Delete
                      </Button>
                    )}
                  </div>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleResumeUpload(file);
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
