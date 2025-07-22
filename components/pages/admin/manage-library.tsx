"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Package, Trash2, RefreshCw, Edit, ChevronRight, ChevronLeft, Info, Receipt, History, Image, Search, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LibraryItem {
  id: string
  item_name: string
  item_description: string
  item_specification?: string
  item_quantity: number
  item_tag_id?: string
  item_category: string
  item_location: string
  image_path: string
  front_image_id?: string
  back_image_id?: string
  invoice_number?: string
  purchase_value?: number | string
  purchased_from?: string
  purchase_currency: string
  purchase_date?: string
  created_by: string
  created_at: string
  modified_at: string
  modified_by?: string
  // Computed fields for display
  imageUrl?: string | null
  backImageUrl?: string | null
  availableQuantity?: number
}

interface SpecificationRow {
  id: string
  attribute: string
  value: string
}

// Utility functions for formatting
function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}

function formatLocation(str: string) {
  // Words to always capitalize fully
  const allCaps = ["library", "rack", "room"]
  return str
    .split(/\s+/)
    .map((word) => {
      if (allCaps.includes(word.toLowerCase())) return word.toUpperCase()
      // Zero-pad numbers
      if (/^\d+$/.test(word)) return word.padStart(2, "0")
      // Title case for other words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

export function ManageLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // Specification table state
  const [specificationRows, setSpecificationRows] = useState<SpecificationRow[]>([
    { id: '1', attribute: '', value: '' },
    { id: '2', attribute: '', value: '' },
    { id: '3', attribute: '', value: '' },
    { id: '4', attribute: '', value: '' }
  ])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<LibraryItem | null>(null)
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false)
  const [itemToView, setItemToView] = useState<LibraryItem | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const [newItem, setNewItem] = useState({
    item_name: "",
    item_description: "",
    item_category: "",
    item_quantity: 1,
    item_location: "",
    item_specification: "",
    item_tag_id: "",
    invoice_number: "",
    purchased_from: "",
    purchase_date: "",
    purchase_value: "",
    purchase_currency: "INR",
  })

  const [frontImageFile, setFrontImageFile] = useState<File | null>(null)
  const [backImageFile, setBackImageFile] = useState<File | null>(null)
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null)
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["General"])
  const [facultyOptions, setFacultyOptions] = useState<{ id: string; name: string }[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null)
  const [isDeleteLocationDialogOpen, setIsDeleteLocationDialogOpen] = useState(false)
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null)
  const [imageStates, setImageStates] = useState<Record<string, boolean>>({}) // false = front, true = back

  // Add form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Bulk upload state
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null)
  const [isBulkUploading, setIsBulkUploading] = useState(false)

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchItems()
    fetchCategories()
    fetchLocations()
    fetchFaculty()
  }, [])

  // Debug user information
  useEffect(() => {
    console.log("ManageLibrary - Current user:", user)
    console.log("ManageLibrary - User ID:", user?.id)
    console.log("ManageLibrary - User name:", user?.name)
    console.log("ManageLibrary - User role:", user?.role)
  }, [user])

  // Refs for click-outside detection
  const locationInputRef = useRef<HTMLDivElement>(null)
  const categoryInputRef = useRef<HTMLDivElement>(null)

  // Click-outside detection for location input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAddLocation &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowAddLocation(false)
        setNewLocation("")
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showAddLocation) {
        setShowAddLocation(false)
        setNewLocation("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscapeKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [showAddLocation])

  // Specification table management functions
  const addSpecificationRow = () => {
    const newRow: SpecificationRow = {
      id: Date.now().toString(),
      attribute: '',
      value: ''
    }
    setSpecificationRows(prev => [...prev, newRow])
  }
  
  const removeSpecificationRow = (id: string) => {
    setSpecificationRows(prev => prev.filter(row => row.id !== id))
  }
  
  const updateSpecificationRow = (id: string, field: 'attribute' | 'value', value: string) => {
    setSpecificationRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }
  
  // Helper function to parse AI specifications into table format
  const parseSpecificationsToTable = (specs: string): SpecificationRow[] => {
    const rows: SpecificationRow[] = []
    let idCounter = 1
    
    // Check if specs are in pipe-separated format (from new AI)
    if (specs.includes('|')) {
      const attributes = specs.split('|').map(attr => attr.trim()).filter(attr => attr)
      attributes.forEach(attribute => {
        // Check if the attribute already contains a value (has colon or equals)
        const colonIndex = attribute.indexOf(':')
        const equalsIndex = attribute.indexOf('=')
        
        if (colonIndex > 0) {
          // Format: "Attribute: Value"
          rows.push({
            id: (idCounter++).toString(),
            attribute: attribute.substring(0, colonIndex).trim(),
            value: attribute.substring(colonIndex + 1).trim()
          })
        } else if (equalsIndex > 0) {
          // Format: "Attribute = Value"
          rows.push({
            id: (idCounter++).toString(),
            attribute: attribute.substring(0, equalsIndex).trim(),
            value: attribute.substring(equalsIndex + 1).trim()
          })
        } else {
          // Just attribute name, provide helpful placeholder value
          const getPlaceholderValue = (attr: string) => {
            const attrLower = attr.toLowerCase();
            if (attrLower.includes('author')) return 'e.g., John Smith';
            if (attrLower.includes('publisher')) return 'e.g., Tech Books';
            if (attrLower.includes('edition')) return 'e.g., 3rd Edition';
            if (attrLower.includes('isbn')) return 'e.g., 978-1234567890';
            if (attrLower.includes('pages')) return 'e.g., 450';
            if (attrLower.includes('year')) return 'e.g., 2023';
            if (attrLower.includes('language')) return 'e.g., English';
            if (attrLower.includes('binding')) return 'e.g., Paperback';
            if (attrLower.includes('subject')) return 'e.g., Computer Science';
            if (attrLower.includes('level')) return 'e.g., Undergraduate';
            return 'Please specify';
          };
          
          rows.push({
            id: (idCounter++).toString(),
            attribute: attribute,
            value: getPlaceholderValue(attribute)
          })
        }
      })
    } else {
      // Legacy format - split by common delimiters and parse
      const lines = specs.split(/[.\n;]/).filter(line => line.trim())
      
      lines.forEach(line => {
        const trimmedLine = line.trim()
        if (trimmedLine) {
          // Try to extract attribute-value pairs
          const patterns = [
            /([^:]+):\s*(.+)/,  // "Attribute: Value"
            /([^=]+)=\s*(.+)/,  // "Attribute = Value"
            /(\w+(?:\s+\w+)*)\s+(.+)/  // "Attribute Value"
          ]
          
          for (const pattern of patterns) {
            const match = trimmedLine.match(pattern)
            if (match) {
              rows.push({
                id: (idCounter++).toString(),
                attribute: match[1].trim(),
                value: match[2].trim()
              })
              break
            }
          }
        }
      })
      
      // If no patterns matched, add the whole spec as a single row
      if (rows.length === 0) {
        rows.push({
          id: '1',
          attribute: 'Description',
          value: specs
        })
      }
    }
    
    // Ensure we have at least 4 rows with default library specifications if needed
    const defaultLibrarySpecs = [
      'Author', 'Publisher', 'Edition', 'ISBN', 
      'Pages', 'Publication Year', 'Language', 'Binding Type'
    ]
    
    while (rows.length < 4) {
      const defaultSpec = defaultLibrarySpecs[rows.length] || ''
      rows.push({
        id: (idCounter++).toString(),
        attribute: defaultSpec,
        value: ''
      })
    }
    
    // Add more empty rows if we have fewer than 6 total
    while (rows.length < 6) {
      rows.push({
        id: (idCounter++).toString(),
        attribute: '',
        value: ''
      })
    }
    
    return rows
  }
  
  // Convert specification rows to string format for API
  const convertSpecificationsToString = (): string => {
    return specificationRows
      .filter(row => row.attribute.trim() || row.value.trim())
      .map(row => `${row.attribute}: ${row.value}`)
      .join('. ')
  }
  
  // Click-outside detection for category input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAddCategory &&
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target as Node)
      ) {
        setShowAddCategory(false)
        setNewCategory("")
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showAddCategory) {
        setShowAddCategory(false)
        setNewCategory("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscapeKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [showAddCategory])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/library-items")
      const data = await response.json()
      setItems(
        (data.items || []).map((item: LibraryItem) => ({
          ...item,
          imageUrl: item.front_image_id ? `/library-images/${item.front_image_id}` : null,
          backImageUrl: item.back_image_id ? `/library-images/${item.back_image_id}` : null,
        }))
      )
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        title: "Error",
        description: "Failed to load Books",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const defaultCategories = ["General"]

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/library-items/categories");
      if (res.ok) {
        const data = await res.json();
        // Merge, dedupe, and format
        const merged = Array.from(
          new Set([
            ...defaultCategories,
            ...(data.categories || [])
          ].map(toTitleCase))
        );
        setCategoryOptions(merged);
      }
    } catch (e) {
      setCategoryOptions(defaultCategories);
    }
  };

  // Fetch faculty list
  const fetchFaculty = async () => {
    try {
      const res = await fetch("/api/faculty");
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.faculty || []).map((f: any) => ({ id: f.id, name: f.user?.name || "Unnamed" }));
        setFacultyOptions(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch faculty", e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/library-items/locations");
      if (res.ok) {
        const data = await res.json();
        setLocationOptions(data.locations || []);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
      // Set default locations as fallback
      setLocationOptions(["Library A", "Library B", "Reading Room", "Storage Room"]);
    }
  };

  const filteredItems = items.filter(
    (item) => {
      const matchesSearch = 
        (item.item_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.item_category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.item_location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === "all" || 
        (item.item_category?.toLowerCase() || '') === selectedCategory.toLowerCase()
      
      return matchesSearch && matchesCategory
    }
  )

  const handleAddItem = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Already submitting, ignoring click')
      return
    }
    
    setIsSubmitting(true)
    console.log('Starting library item submission...')
    
    try {
    // Validate form before proceeding
      if (!isAddFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      })
      return
    }

    // If Tag ID is empty, check for duplicate
    if (!newItem.item_tag_id) {
      const formattedCategory = toTitleCase(newItem.item_category)
      const formattedLocation = formatLocation(newItem.item_location)
      const existing = items.find(
        i =>
          (i.item_name?.trim().toLowerCase() || '') === (newItem.item_name?.trim().toLowerCase() || '') &&
          (i.item_category?.trim().toLowerCase() || '') === (formattedCategory?.trim().toLowerCase() || '') &&
          (i.item_location?.trim().toLowerCase() || '') === (formattedLocation?.trim().toLowerCase() || '')
      )
      if (existing) {
        if (!window.confirm("This item already exists. The quantity you add will be added to the existing one. Continue?")) {
          return
        }
        // Simulate updating the quantity in the frontend (no backend yet)
        setItems(prev =>
          prev.map(i =>
            i.id === existing.id
              ? { ...i, item_quantity: i.item_quantity + newItem.item_quantity, availableQuantity: (i.availableQuantity || 0) + newItem.item_quantity }
              : i
          )
        )
        toast({
          title: "Quantity Updated",
          description: "The quantity has been added to the existing item.",
        })
        // Reset form
        setIsAddDialogOpen(false)
        return
      }
    }

    let frontImageUrl = undefined
    let backImageUrl = undefined

    // Upload front image
    if (frontImageFile) {
      const formData = new FormData()
      formData.append('image', frontImageFile)
      const uploadRes = await fetch('/api/library-items/upload', {
        method: 'POST',
        body: formData,
      })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        frontImageUrl = data.imageUrl.split('/').pop() // Get file name from URL
      } else {
        toast({
          title: "Error",
          description: "Front image upload failed",
          variant: "destructive",
        })
        return
      }
    }

    // Upload back image
    if (backImageFile) {
      const formData = new FormData()
      formData.append('image', backImageFile)
      const uploadRes = await fetch('/api/library-items/upload', {
        method: 'POST',
        body: formData,
      })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        backImageUrl = data.imageUrl.split('/').pop() // Get file name from URL
      } else {
        toast({
          title: "Error",
          description: "Back image upload failed",
          variant: "destructive",
        })
        return
      }
    }

    // Format category and location before sending
    const formattedCategory = toTitleCase(newItem.item_category)
    const formattedLocation = formatLocation(newItem.item_location)

      const response = await fetch("/api/library-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          ...newItem,
          item_category: formattedCategory,
          item_location: formattedLocation,
          front_image_id: frontImageUrl,
          back_image_id: backImageUrl,
          created_by: user?.name || "system-fallback"
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItems((prev) => [...prev, data.item])
        
        // Reset form
        setIsAddDialogOpen(false)

        toast({
          title: "Success",
          description: "Book added successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add item")
      }
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log('Library item submission finished')
    }
  }

  // AI Analysis function
  const handleAIAnalysis = async () => {
    if (!frontImageFile || !backImageFile) {
      toast({
        title: "Error",
        description: "Both front and back images are required for AI analysis",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    
    try {
      const formData = new FormData()
      formData.append('frontImage', frontImageFile)
      formData.append('backImage', backImageFile)
      formData.append('itemType', 'library') // Specify this is for library items

      const response = await fetch('/api/ai-analyze-images', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze images')
      }

      const data = await response.json()
      
      if (data.status === 'error') {
        // Handle validation errors (wrong item type)
        toast({
          title: "Invalid Item Type",
          description: data.error || "Please upload images of library books only, not lab components.",
          variant: "destructive",
        })
        return
      }
      
      if (data.status === 'success' && data.result) {
        setNewItem(prev => ({
          ...prev,
          item_name: data.result.name,
          item_description: data.result.description,
          item_specification: data.result.specifications
        }))
        
        // Parse AI specifications into table format if possible
        if (data.result.specifications) {
          const parsedSpecs = parseSpecificationsToTable(data.result.specifications)
          setSpecificationRows(parsedSpecs)
        }
        
        toast({
          title: "AI Analysis Complete",
          description: "Item name, description and specifications have been generated successfully",
        })
      } else {
        throw new Error(data.error || 'AI analysis failed')
      }
      
    } catch (error) {
      console.error('AI Analysis Error:', error)
      toast({
        title: "AI Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze images",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetForm = () => {
    setNewItem({
      item_name: "",
      item_description: "",
      item_category: "",
      item_quantity: 1,
      item_location: "",
      item_specification: "",
      item_tag_id: "",
      invoice_number: "",
      purchased_from: "",
      purchase_date: "",
      purchase_value: "",
      purchase_currency: "INR",
    })
    setFrontImageFile(null)
    setBackImageFile(null)
    setFrontImagePreview(null)
    setBackImagePreview(null)
    setNewCategory("")
    setIsSavingCategory(false)
    setIsAnalyzing(false)
    setShowAddCategory(false)
    setCategoryToDelete(null)
    setIsDeleteCategoryDialogOpen(false)
    setShowAddLocation(false)
    setNewLocation("")
    setIsSavingLocation(false)
    setLocationToDelete(null)
    setIsDeleteLocationDialogOpen(false)
            setIsAddDialogOpen(false)
        setEditingItem(null)
    setImageStates({})
    setFormErrors({})
    setIsSubmitting(false)
  }

  // Bulk upload functions
  const downloadSampleCSV = (e: React.MouseEvent) => {
    e.preventDefault()
    const headers = [
      'item_name',
      'item_description', 
      'item_specification',
      'item_quantity',
      'item_tag_id',
      'item_category',
      'item_location',
      'front_image_id',
      'back_image_id',
      'invoice_number',
      'purchase_value',
      'purchased_from',
      'purchase_currency',
      'purchase_date'
    ]
    
    const sampleData = [
      [
        'Introduction to Computer Science',
        'A comprehensive guide to computer science fundamentals covering algorithms and programming',
        'Pages: 500, Edition: 5th, Publisher: Tech Books, ISBN: 978-0123456789',
        '5',
        'LIB001',
        'Computer Science',
        'Library A',
        'book-cs-front.jpg',
        'book-cs-back.jpg',
        'INV001',
        '1200.00',
        'Academic Publishers',
        'INR',
        '2024-01-15'
      ],
      [
        'Data Structures and Algorithms',
        'Advanced concepts in data structures with algorithmic problem solving techniques',
        'Pages: 680, Edition: 4th, Publisher: Algorithm Press, ISBN: 978-0987654321',
        '8',
        'LIB002',
        'Computer Science',
        'Library A',
        'book-dsa-front.jpg',
        'book-dsa-back.jpg',
        'INV002',
        '1500.00',
        'Educational Books Ltd',
        'INR',
        '2024-01-20'
      ],
      [
        'Digital Electronics',
        'Comprehensive guide to digital circuits, logic design, and microprocessors',
        'Pages: 520, Edition: 2nd, Publisher: Circuit Books, ISBN: 978-0456789123',
        '6',
        'LIB003',
        'Electronics',
        'Library B',
        'book-digital-front.jpg',
        'book-digital-back.jpg',
        'INV003',
        '980.00',
        'Engineering Publishers',
        'INR',
        '2024-01-25'
      ],
      [
        'Machine Learning Fundamentals',
        'Introduction to ML algorithms, neural networks, and deep learning concepts',
        'Pages: 720, Edition: 1st, Publisher: AI Books, ISBN: 978-0234567891',
        '4',
        'LIB004',
        'Artificial Intelligence',
        'Library A',
        'book-ml-front.jpg',
        'book-ml-back.jpg',
        'INV004',
        '2200.00',
        'Tech Knowledge Publishers',
        'INR',
        '2024-02-01'
      ],
      [
        'Computer Networks',
        'Networking protocols, architecture, security, and network programming',
        'Pages: 640, Edition: 5th, Publisher: Network Press, ISBN: 978-0345678912',
        '7',
        'LIB005',
        'Networking',
        'Library B',
        'book-network-front.jpg',
        'book-network-back.jpg',
        'INV005',
        '1350.00',
        'Technical Books Inc',
        'INR',
        '2024-02-05'
      ],
      [
        'Database Management Systems',
        'SQL, NoSQL, database design principles, and optimization techniques',
        'Pages: 580, Edition: 3rd, Publisher: Data Books, ISBN: 978-0567891234',
        '6',
        'LIB006',
        'Database',
        'Library A',
        'book-db-front.jpg',
        'book-db-back.jpg',
        'INV006',
        '1180.00',
        'Information Systems Publishers',
        'INR',
        '2024-02-10'
      ],
      [
        'Software Engineering',
        'Software development lifecycle, design patterns, and project management',
        'Pages: 620, Edition: 6th, Publisher: Software Press, ISBN: 978-0678912345',
        '5',
        'LIB007',
        'Software Engineering',
        'Library A',
        'book-se-front.jpg',
        'book-se-back.jpg',
        'INV007',
        '1650.00',
        'Professional Books Corp',
        'INR',
        '2024-02-15'
      ]
    ]
    
    const csvContent = [headers.join(','), ...sampleData.map(row => row.map(field => `"${field}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'library-items-sample.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) return
    
    setIsBulkUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('csv', bulkUploadFile)
      
      const response = await fetch('/api/library-items/bulk-upload', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id || '',
        },
        body: formData,
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Bulk upload completed! Processed: ${result.processed}, Errors: ${result.errors}`,
        })
        
        if (result.errors > 0) {
          console.log('Upload errors:', result.error_details)
        }
        
        // Refresh items list
        fetchItems()
        
        // Close dialog and reset
        setIsBulkUploadDialogOpen(false)
        setBulkUploadFile(null)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Bulk upload error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      })
    } finally {
      setIsBulkUploading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Required fields validation
    if (!newItem.item_name?.trim()) {
      errors.item_name = "Book name is required"
    }

    if (!newItem.item_description?.trim()) {
      errors.item_description = "Description is required"
    }

    if (!newItem.item_category?.trim()) {
      errors.item_category = "Category is required"
    }

    if (!newItem.item_location?.trim()) {
      errors.item_location = "Location is required"
    }

    if (newItem.item_quantity <= 0) {
      errors.item_quantity = "Quantity must be greater than 0"
    }



    if (!frontImageFile) {
      errors.frontImage = "Front image is required"
    }

    if (!backImageFile) {
      errors.backImage = "Back image is required"
    }

    // Purchase details validation (optional but if one is filled, others should be too)
    const hasPurchaseDetails = newItem.invoice_number || newItem.purchased_from || newItem.purchase_date || newItem.purchase_value
    if (hasPurchaseDetails) {
      if (!newItem.invoice_number?.trim()) {
        errors.invoice_number = "Invoice number is required when providing purchase details"
      }
      if (!newItem.purchased_from?.trim()) {
        errors.purchased_from = "Purchased from is required when providing purchase details"
      }
      if (!newItem.purchase_date) {
        errors.purchase_date = "Purchase date is required when providing purchase details"
      }
      if (!newItem.purchase_value) {
        errors.purchase_value = "Purchase value is required when providing purchase details"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEditItem = async () => {
    if (!editingItem) return
    if (!editingItem.item_name || !editingItem.item_category || !editingItem.item_location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    let frontImageId = editingItem.front_image_id
    let backImageId = editingItem.back_image_id
    // Upload front image if changed
    if (frontImageFile) {
      const formData = new FormData()
      formData.append('image', frontImageFile)
      const uploadRes = await fetch('/api/library-items/upload', {
        method: 'POST',
        body: formData,
      })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        frontImageId = data.imageUrl.split('/').pop()
      } else {
        toast({
          title: "Error",
          description: "Front image upload failed",
          variant: "destructive",
        })
        return
      }
    }
    // Upload back image if changed
    if (backImageFile) {
      const formData = new FormData()
      formData.append('image', backImageFile)
      const uploadRes = await fetch('/api/library-items/upload', {
        method: 'POST',
        body: formData,
      })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        backImageId = data.imageUrl.split('/').pop()
      } else {
        toast({
          title: "Error",
          description: "Back image upload failed",
          variant: "destructive",
        })
        return
      }
    }
    try {
      const response = await fetch(`/api/library-items/${editingItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          ...editingItem,
          item_specification: convertSpecificationsToString(),
          front_image_id: frontImageId,
          back_image_id: backImageId,
          modified_by: user?.name || "system-fallback",
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? data.item : i)))
        setEditingItem(null)
        setFrontImageFile(null)
        setBackImageFile(null)
        setFrontImagePreview(null)
        setBackImagePreview(null)
        setIsAddDialogOpen(false)
        toast({
          title: "Success",
          description: "Book updated successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update item")
      }
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const isAddFormValid = () => {
    return (
      (editingItem
        ? editingItem.item_name?.trim() &&
          editingItem.item_description?.trim() &&
          editingItem.item_category?.trim() &&
          editingItem.item_location?.trim() &&
          editingItem.item_quantity > 0
        : newItem.item_name?.trim() &&
          newItem.item_description?.trim() &&
          newItem.item_category?.trim() &&
          newItem.item_location?.trim() &&
          newItem.item_quantity > 0
      ) &&
      frontImageFile &&
      backImageFile
    )
  }

  // Delete handler for library items
  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/library-items/${itemId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== itemId))
        toast({
          title: "Success",
          description: "Item deleted successfully",
        })
        setIsDeleteDialogOpen(false)
        setItemToDelete(null)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    setIsSavingCategory(true)
    try {
      const res = await fetch("/api/library-items/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory.trim() })
      })
      
      if (res.ok) {
        const data = await res.json()
        const formattedCategory = data.category
        setCategoryOptions((prev) => [...prev, formattedCategory])
        setNewItem((prev) => ({ ...prev, item_category: formattedCategory }))
        setNewCategory("")
        setShowAddCategory(false)
        toast({ title: "Category added!", description: "New category added successfully." })
      } else {
        const error = await res.json()
        toast({ 
          title: "Error", 
          description: error.error || "Failed to add category.", 
          variant: "destructive" 
        })
      }
    } catch (error) {
      console.error("Error adding category:", error)
      toast({ 
        title: "Error", 
        description: "Failed to add category.", 
        variant: "destructive" 
      })
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/library-items/categories?category=${encodeURIComponent(category)}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setCategoryOptions((prev) => prev.filter(cat => cat !== category))
        toast({ 
          title: "Category removed!", 
          description: "Category removed successfully." 
        })
      } else {
        const error = await res.json()
        if (error.componentsUsing) {
          toast({ 
            title: "Cannot delete category", 
            description: `Category is being used by ${error.count} item(s). Remove items first.`, 
            variant: "destructive" 
          })
        } else {
          toast({ 
            title: "Error", 
            description: error.error || "Failed to delete category.", 
            variant: "destructive" 
          })
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({ 
        title: "Error", 
        description: "Failed to delete category.", 
        variant: "destructive" 
      })
    } finally {
      setIsDeleteCategoryDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return
    setIsSavingLocation(true)
    try {
      const res = await fetch("/api/library-items/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: newLocation.trim() })
      })
      
      if (res.ok) {
        const data = await res.json()
        const formattedLocation = data.location
        setLocationOptions((prev) => [...prev, formattedLocation])
        setNewItem((prev) => ({ ...prev, item_location: formattedLocation }))
        setNewLocation("")
        setShowAddLocation(false)
        toast({ title: "Location added!", description: "New location added successfully." })
      } else {
        const error = await res.json()
        toast({ 
          title: "Error", 
          description: error.error || "Failed to add location.", 
          variant: "destructive" 
        })
      }
    } catch (error) {
      console.error("Error adding location:", error)
      toast({ 
        title: "Error", 
        description: "Failed to add location.", 
        variant: "destructive" 
      })
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleDeleteLocation = async (location: string) => {
    try {
      const res = await fetch(`/api/library-items/locations?location=${encodeURIComponent(location)}`, {
        method: "DELETE"
      })
      
      if (res.ok) {
        setLocationOptions((prev) => prev.filter(loc => loc !== location))
        toast({ 
          title: "Location removed!", 
          description: "Location removed successfully." 
        })
      } else {
        const error = await res.json()
        if (error.componentsUsing) {
          toast({ 
            title: "Cannot delete location", 
            description: `Location is being used by ${error.count} item(s). Remove items first.`, 
            variant: "destructive" 
          })
        } else {
          toast({ 
            title: "Error", 
            description: error.error || "Failed to delete location.", 
            variant: "destructive" 
          })
        }
      }
    } catch (error) {
      console.error("Error deleting location:", error)
      toast({ 
        title: "Error", 
        description: "Failed to delete location.", 
        variant: "destructive" 
      })
    } finally {
      setIsDeleteLocationDialogOpen(false)
      setLocationToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading library books...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="admin-page-title">Library Management</h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchItems} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "Editing..." : "Edit Mode"}
          </Button>
          <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Upload Books</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to add multiple books at once. 
                  <br />
                  <a 
                    href="#" 
                    onClick={downloadSampleCSV}
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Download sample CSV template
                  </a>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      setBulkUploadFile(file || null)
                      if (file) {
                        console.log(`Selected file: ${file.name} (${file.size} bytes)`)
                      }
                    }}
                    className="mt-1"
                  />
                  {bulkUploadFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsBulkUploadDialogOpen(false)
                    setBulkUploadFile(null)
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkUpload} disabled={!bulkUploadFile || isBulkUploading}>
                    {isBulkUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              resetForm()
              setEditingItem(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-2 mr-2" />
                Add Books
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-full max-h-[98vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Library Book" : "Add New Library Book"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[calc(90vh-120px)] overflow-y-auto">
                {/* Left Column: Basic Info & Images */}
                <div className="space-y-6 pr-3 pl-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label htmlFor="name">Book Name *</Label>
                        <Input 
                          id="name" 
                          value={editingItem ? editingItem.item_name : newItem.item_name} 
                          onChange={(e) => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, item_name: e.target.value })
                            : setNewItem((prev) => ({ ...prev, item_name: e.target.value }))}
                          className={`mt-1 ${formErrors.item_name ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.item_name && <p className="text-red-500 text-xs mt-1">{formErrors.item_name}</p>}
                      </div>
                      <div className="col-span-1">
                        <Label htmlFor="tagId">Tag ID (optional)</Label>
                        <Input 
                          id="tagId" 
                          value={editingItem ? editingItem.item_tag_id : newItem.item_tag_id} 
                          onChange={e => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, item_tag_id: e.target.value })
                            : setNewItem((prev) => ({ ...prev, item_tag_id: e.target.value }))}
                          className="mt-1" 
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="location">Location *</Label>
                          <div className="flex space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddLocation(true)}
                              className="h-6 w-6 p-0"
                              title="Add location"
                              aria-label="Add location"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {newItem.item_location && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLocationToDelete(newItem.item_location)
                                  setIsDeleteLocationDialogOpen(true)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                title="Delete location"
                                aria-label="Delete location"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {showAddLocation ? (
                          <div ref={locationInputRef} className="flex gap-2 mt-1">
                            <Input
                              placeholder="Enter location (e.g., Library A, Storage Room)"
                              value={newLocation}
                              onChange={(e) => setNewLocation(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddLocation}
                              disabled={!newLocation.trim() || isSavingLocation}
                            >
                              {isSavingLocation ? "Adding..." : "Add"}
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value={editingItem ? editingItem.item_location : newItem.item_location} 
                            onValueChange={(value) => editingItem
                              ? setEditingItem((prev) => prev && { ...prev, item_location: value })
                              : setNewItem((prev) => ({ ...prev, item_location: value }))}
                          >
                            <SelectTrigger className={`mt-1 ${formErrors.item_location ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locationOptions.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {formErrors.item_location && <p className="text-red-500 text-xs mt-1">{formErrors.item_location}</p>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="category">Category *</Label>
                          <div className="flex space-x-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAddCategory(true)}
                              className="h-6 w-6 p-0"
                              title="Add category"
                              aria-label="Add category"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {newItem.item_category && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCategoryToDelete(newItem.item_category)
                                  setIsDeleteCategoryDialogOpen(true)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                title="Delete category"
                                aria-label="Delete category"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {showAddCategory ? (
                          <div ref={categoryInputRef} className="flex gap-2 mt-1">
                            <Input
                              placeholder="Enter category (e.g., Computer Science, Electronics)"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddCategory}
                              disabled={!newCategory.trim() || isSavingCategory}
                            >
                              {isSavingCategory ? "Adding..." : "Add"}
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value={editingItem ? editingItem.item_category : newItem.item_category} 
                            onValueChange={(value) => editingItem
                              ? setEditingItem((prev) => prev && { ...prev, item_category: value })
                              : setNewItem((prev) => ({ ...prev, item_category: value }))}
                          >
                            <SelectTrigger className={`mt-1 ${formErrors.item_category ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {formErrors.item_category && <p className="text-red-500 text-xs mt-1">{formErrors.item_category}</p>}
                      </div>
                      <div className="w-20">
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input 
                          id="quantity" 
                          type="number" 
                          value={editingItem ? editingItem.item_quantity : newItem.item_quantity} 
                          onChange={(e) => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, item_quantity: Number.parseInt(e.target.value) })
                            : setNewItem((prev) => ({ ...prev, item_quantity: Number.parseInt(e.target.value) }))}
                          min="1" 
                          className={`mt-1 ${formErrors.item_quantity ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.item_quantity && <p className="text-red-500 text-xs mt-1">{formErrors.item_quantity}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Book Images</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button" 
                        className="h-8"
                        onClick={handleAIAnalysis}
                        disabled={!frontImageFile || !backImageFile || isAnalyzing}
                        title={!frontImageFile || !backImageFile ? "Upload both front and back images first" : "Analyze images with AI"}
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <img src="/genAI_icon.png" alt="GenAI" className="h-7 w-7" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="frontImage">Front Image *</Label>
                        <Input 
                          id="frontImage" 
                          type="file" 
                          accept="image/*" 
                          onChange={e => {
                            const file = e.target.files?.[0] || null
                            setFrontImageFile(file)
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (ev) => setFrontImagePreview(ev.target?.result as string)
                              reader.readAsDataURL(file)
                            } else {
                              setFrontImagePreview(null)
                            }
                          }}
                          className={`mt-1 ${formErrors.frontImage ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.frontImage && <p className="text-red-500 text-xs mt-1">{formErrors.frontImage}</p>}
                        {frontImagePreview && (
                          <div className="mt-2">
                            <img
                              src={frontImagePreview}
                              alt="Front Preview"
                              className="w-full h-40 object-contain rounded-lg bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="backImage">Back Image *</Label>
                        <Input 
                          id="backImage" 
                          type="file" 
                          accept="image/*" 
                          onChange={e => {
                            const file = e.target.files?.[0] || null
                            setBackImageFile(file)
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (ev) => setBackImagePreview(ev.target?.result as string)
                              reader.readAsDataURL(file)
                            } else {
                              setBackImagePreview(null)
                            }
                          }}
                          className={`mt-1 ${formErrors.backImage ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.backImage && <p className="text-red-500 text-xs mt-1">{formErrors.backImage}</p>}
                        {backImagePreview && (
                          <div className="mt-2">
                            <img
                              src={backImagePreview}
                              alt="Back Preview"
                              className="w-full h-40 object-contain rounded-lg bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right Column: Details & Purchase Info */}
                <div className="space-y-6 pr-2">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea 
                        id="description" 
                        value={editingItem ? editingItem.item_description : newItem.item_description} 
                        onChange={e => editingItem
                          ? setEditingItem((prev) => prev && { ...prev, item_description: e.target.value })
                          : setNewItem((prev) => ({ ...prev, item_description: e.target.value }))}
                        rows={4} 
                        className={`mt-1 resize-none leading-relaxed ${formErrors.item_description ? 'border-red-500' : ''}`} 
                        placeholder="Describe the book's subject matter, target audience, and key topics (max 250 characters)"
                        maxLength={250}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {formErrors.item_description && <p className="text-red-500 text-xs">{formErrors.item_description}</p>}
                        <p className="text-xs text-gray-500 ml-auto">{(editingItem ? editingItem.item_description : newItem.item_description).length}/250 characters</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label>Specifications</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSpecificationRow}
                          className="h-6 w-6 p-0"
                          title="Add specification row"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {specificationRows.map((row, index) => (
                          <div key={row.id} className="flex items-center space-x-2">
                            <Input
                              placeholder="Attribute (e.g., Pages)"
                              value={row.attribute}
                              onChange={(e) => updateSpecificationRow(row.id, 'attribute', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            <Input
                              placeholder="Value (e.g., 500)"
                              value={row.value}
                              onChange={(e) => updateSpecificationRow(row.id, 'value', e.target.value)}
                              className="flex-1 h-8 text-sm"
                            />
                            {specificationRows.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSpecificationRow(row.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Purchase Details (Optional)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="invoiceNumber">Invoice Number</Label>
                        <Input 
                          id="invoiceNumber" 
                          value={editingItem ? editingItem.invoice_number : newItem.invoice_number} 
                          onChange={e => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, invoice_number: e.target.value })
                            : setNewItem((prev) => ({ ...prev, invoice_number: e.target.value }))}
                          className={`mt-1 ${formErrors.invoice_number ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.invoice_number && <p className="text-red-500 text-xs mt-1">{formErrors.invoice_number}</p>}
                      </div>
                      <div>
                        <Label htmlFor="purchasedFrom">Purchased From</Label>
                        <Input 
                          id="purchasedFrom" 
                          value={editingItem ? editingItem.purchased_from : newItem.purchased_from} 
                          onChange={e => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, purchased_from: e.target.value })
                            : setNewItem((prev) => ({ ...prev, purchased_from: e.target.value }))}
                          className={`mt-1 ${formErrors.purchased_from ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.purchased_from && <p className="text-red-500 text-xs mt-1">{formErrors.purchased_from}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="purchasedDate">Purchase Date</Label>
                        <Input 
                          id="purchasedDate" 
                          type="date" 
                          value={editingItem ? editingItem.purchase_date : newItem.purchase_date} 
                          onChange={e => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, purchase_date: e.target.value })
                            : setNewItem((prev) => ({ ...prev, purchase_date: e.target.value }))}
                          className={`mt-1 ${formErrors.purchase_date ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.purchase_date && <p className="text-red-500 text-xs mt-1">{formErrors.purchase_date}</p>}
                      </div>
                      <div>
                        <Label htmlFor="purchasedValue">Purchase Value</Label>
                        <Input 
                          id="purchasedValue" 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          value={editingItem ? editingItem.purchase_value : newItem.purchase_value} 
                          onChange={e => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, purchase_value: e.target.value })
                            : setNewItem((prev) => ({ ...prev, purchase_value: e.target.value }))}
                          placeholder="0.00" 
                          className={`mt-1 ${formErrors.purchase_value ? 'border-red-500' : ''}`} 
                        />
                        {formErrors.purchase_value && <p className="text-red-500 text-xs mt-1">{formErrors.purchase_value}</p>}
                      </div>
                      <div>
                        <Label htmlFor="purchasedCurrency">Currency</Label>
                        <Select 
                          value={editingItem ? editingItem.purchase_currency : newItem.purchase_currency} 
                          onValueChange={value => editingItem
                            ? setEditingItem((prev) => prev && { ...prev, purchase_currency: value })
                            : setNewItem((prev) => ({ ...prev, purchase_currency: value }))}
                        >
                          <SelectTrigger className={`mt-1 ${formErrors.purchase_currency ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.purchase_currency && <p className="text-red-500 text-xs mt-1">{formErrors.purchase_currency}</p>}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Form Actions */}
                <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }} className="px-6">Cancel</Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              editingItem ? handleEditItem() : handleAddItem()
                            }}
                            disabled={!isAddFormValid()}
                          >
                            {isSubmitting ? "Processing..." : (editingItem ? "Update Item" : "Add Item")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isAddFormValid() && (
                        <TooltipContent>
                          <p>Please fill in all required fields: Book Name, Description, Category, Location, Quantity, Front Image, and Back Image.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4 pb-1">
        <div className="relative w-full md:w-1/2 lg:w-1/3">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <Input
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-2 h-9 w-full text-sm"
          />
        </div>
        <span className="flex items-center ml-4 mr-1 text-gray-400"><Filter className="h-5 w-5" /></span>
        <span className="text-sm text-gray-600 font-medium ml-1">Category</span>
        <div className="w-40 flex flex-col">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Category">{selectedCategory !== "all" ? selectedCategory : undefined}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">Add your first book to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="admin-card rounded-xl shadow-sm border hover:shadow-md transition-shadow flex flex-col justify-between h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-semibold">{item.item_name}</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setItemToView(item)
                      setIsInfoDialogOpen(true)
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Image Display with Fade Animation */}
                  {(item.imageUrl || item.backImageUrl) && (
                    <div className="relative w-full h-48 shadow-lg hover:shadow-lg transition-shadow duration-100 rounded-lg overflow-hidden">
                      {/* Front Image */}
                      <div 
                        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ease-in-out ${
                          imageStates[item.id] ? 'opacity-0' : 'opacity-100'
                        }`}
                      >
                        <img
                          src={item.imageUrl || '/placeholder.jpg'}
                          alt={`Front view of ${item.item_name}`}
                          className="w-full h-full object-contain rounded-lg bg-gray-50"
                        />
                      </div>
                      {/* Back Image */}
                      {item.backImageUrl && (
                        <div 
                          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ease-in-out ${
                            imageStates[item.id] ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <img
                            src={item.backImageUrl}
                            alt={`Back view of ${item.item_name}`}
                            className="w-full h-full object-contain rounded-lg bg-gray-50"
                          />
                        </div>
                      )}
                      {/* Navigation Buttons */}
                      {item.backImageUrl && (
                        <>
                          {/* Show right arrow when on front image */}
                          {!imageStates[item.id] && (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                              onClick={() => setImageStates(prev => ({ ...prev, [item.id]: true }))}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Show left arrow when on back image */}
                          {imageStates[item.id] && (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                              onClick={() => setImageStates(prev => ({ ...prev, [item.id]: false }))}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {/* Image Indicator */}
                      {item.backImageUrl && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10">
                          <div 
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                              !imageStates[item.id] ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                          <div 
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                              imageStates[item.id] ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-700">Total Quantity</p>
                      <p>{item.item_quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">Category</p>
                      <p>{item.item_category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">Location</p>
                      <p>{item.item_location}</p>
                    </div>
                  </div>
                  {editMode && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setIsAddDialogOpen(true)
                        // Set image previews if images exist
                        if (item.imageUrl) {
                          setFrontImagePreview(item.imageUrl)
                        }
                        if (item.backImageUrl) {
                          setBackImagePreview(item.backImageUrl)
                        }
                      }}
                      className="btn-edit"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setItemToDelete(item)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="btn-delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                  )}
                </div>
              </CardContent>
            </div>
          ))
        )}
      </div>

      {/* Info Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-600" />
              Book Details
            </DialogTitle>
          </DialogHeader>
          {itemToView && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Basic Information */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Name</Label>
                    <div className="text-sm font-medium text-gray-900">{itemToView.item_name}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Category</Label>
                    <div className="text-sm font-medium text-gray-900">{itemToView.item_category}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Location</Label>
                    <div className="text-sm font-medium text-gray-900">{itemToView.item_location}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Tag ID</Label>
                    <div className="text-sm font-medium text-gray-900">{itemToView.item_tag_id || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500">Total Quantity</Label>
                    <div className="text-sm font-medium text-gray-900">{itemToView.item_quantity}</div>
                  </div>

                </div>
                <div className="mt-3">
                  <Label className="text-xs font-medium text-gray-500">Description</Label>
                  <div className="text-xs text-gray-700 mt-1">{itemToView.item_description}</div>
                </div>
                {itemToView.item_specification && (
                  <div className="mt-2">
                    <Label className="text-xs font-medium text-gray-500">Specification</Label>
                    <div className="text-xs text-gray-700 mt-1">{itemToView.item_specification}</div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Purchase Details and Audit Trail */}
              <div className="space-y-3">
                {/* Purchase Details */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Purchase Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Invoice Number</Label>
                      <div className="text-sm text-gray-900">{itemToView.invoice_number || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Purchased From</Label>
                      <div className="text-sm text-gray-900">{itemToView.purchased_from || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Purchase Date</Label>
                      <div className="text-sm text-gray-900">
                        {itemToView.purchase_date ? new Date(itemToView.purchase_date).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Purchase Value</Label>
                      <div className="text-sm text-gray-900">{itemToView.purchase_value || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Currency</Label>
                      <div className="text-sm text-gray-900">{itemToView.purchase_currency || '-'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Audit Trail */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Audit Trail
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Created By</Label>
                      <div className="text-sm text-gray-900">{itemToView.created_by || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Created At</Label>
                      <div className="text-sm text-gray-900">
                        {itemToView.created_at ? new Date(itemToView.created_at).toLocaleDateString() : '-'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Last Modified By</Label>
                      <div className="text-sm text-gray-900">{itemToView.modified_by || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500">Last Modified At</Label>
                      <div className="text-sm text-gray-900">
                        {itemToView.modified_at ? new Date(itemToView.modified_at).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Books</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => itemToDelete && handleDeleteItem(itemToDelete.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone if the category is not being used by any items.
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium">Category: {categoryToDelete}</p>
                <p className="text-sm text-gray-600 mt-1">
                  This will remove the category from the available options. Items currently using this category will not be affected.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteCategoryDialogOpen(false)
                    setCategoryToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Location Confirmation Dialog */}
      <Dialog open={isDeleteLocationDialogOpen} onOpenChange={setIsDeleteLocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Location
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this location? This action cannot be undone if the location is not being used by any items.
            </DialogDescription>
          </DialogHeader>
          {locationToDelete && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium">Location: {locationToDelete}</p>
                <p className="text-sm text-gray-600 mt-1">
                  This will remove the location from the available options. Items currently using this location will not be affected.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteLocationDialogOpen(false)
                    setLocationToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => locationToDelete && handleDeleteLocation(locationToDelete)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Location
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 