import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  Plus,
  X,
  Users,
  Calendar,
  Settings,
  Coffee,
  AlertCircle,
} from "lucide-react";

// Helper functions
const generateTimeSlots = (startTime, endTime, interval = 15) => {
  const slots = [];
  let current = new Date(`2024-01-01 ${startTime}`);
  const end = new Date(`2024-01-01 ${endTime}`);

  while (current < end) {
    slots.push(
      current.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
    current = new Date(current.getTime() + interval * 60000);
  }
  return slots;
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

const AdvancedSchedulingApp = () => {
  // Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState("month"); // 'month', 'week', 'day'

  // Holiday/Special Hours State
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({
    date: "",
    name: "",
    isFullDay: true,
    startTime: "",
    endTime: "",
    isRecurringYearly: false,
  });

  // Staff Working Hours State
  const [staffWorkingHours, setStaffWorkingHours] = useState({});

  // Basic Settings
  const [organizationSettings, setOrganizationSettings] = useState({
    startTime: "08:00",
    endTime: "22:00",
    slotDuration: 15,
    maxConcurrentBookings: 1,
    enableBufferTime: false,
    defaultBufferTime: 15,
    allowRecurringBookings: true,
  });

  // Services State
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: "",
    duration: "30",
    price: "",
    capacity: 1,
    color: "#4CAF50",
  });

  // Staff State
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({
    name: "",
    services: [],
    workingHours: {
      monday: { start: "08:00", end: "17:00", isWorking: true },
      tuesday: { start: "08:00", end: "17:00", isWorking: true },
      wednesday: { start: "08:00", end: "17:00", isWorking: true },
      thursday: { start: "08:00", end: "17:00", isWorking: true },
      friday: { start: "08:00", end: "17:00", isWorking: true },
      saturday: { start: "08:00", end: "14:00", isWorking: true },
      sunday: { start: "00:00", end: "00:00", isWorking: false },
    },
    breaks: [],
  });

  // Break Times State
  const [breakTimes, setBreakTimes] = useState([]);
  const [newBreak, setNewBreak] = useState({
    startTime: "",
    endTime: "",
    recurring: true,
    daysOfWeek: [],
  });

  // Calendar View Component
  const CalendarView = () => {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const isHoliday = (day) => {
      if (!day) return false; // Return false for empty calendar cells
      const dateStr = `${currentYear}-${(currentMonth + 1)
        .toString()
        .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      return holidays.some((holiday) => holiday.date === dateStr);
    };

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() =>
                setSelectedDate(new Date(currentYear, currentMonth - 1))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setSelectedDate(new Date(currentYear, currentMonth + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-2 text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => (
            <div
              key={index}
              className={`bg-white min-h-24 p-2 ${
                day ? "hover:bg-gray-50 cursor-pointer" : ""
              } ${isHoliday(day) ? "bg-red-50" : ""}`}
              onClick={() =>
                day && setSelectedDate(new Date(currentYear, currentMonth, day))
              }
            >
              {day && (
                <>
                  <span
                    className={`text-sm ${
                      isHoliday(day) ? "text-red-600 font-medium" : ""
                    }`}
                  >
                    {day}
                  </span>
                  {isHoliday(day) && (
                    <div className="text-xs text-red-600 mt-1">
                      {
                        holidays.find((h) => {
                          const hDate = new Date(h.date);
                          return (
                            hDate.getDate() === day &&
                            hDate.getMonth() === currentMonth &&
                            hDate.getFullYear() === currentYear
                          );
                        })?.name
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Holiday Management Component
  const HolidayManager = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Holiday Name</Label>
            <Input
              placeholder="Holiday name"
              value={newHoliday.name}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={newHoliday.date}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, date: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Full Day</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={newHoliday.isFullDay}
                onCheckedChange={(checked) =>
                  setNewHoliday({ ...newHoliday, isFullDay: checked })
                }
              />
              <span>{newHoliday.isFullDay ? "Yes" : "No"}</span>
            </div>
          </div>
          {!newHoliday.isFullDay && (
            <>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select
                  value={newHoliday.startTime}
                  onValueChange={(value) =>
                    setNewHoliday({ ...newHoliday, startTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select
                  value={newHoliday.endTime}
                  onValueChange={(value) =>
                    setNewHoliday({ ...newHoliday, endTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Recurring Yearly</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={newHoliday.isRecurringYearly}
                onCheckedChange={(checked) =>
                  setNewHoliday({ ...newHoliday, isRecurringYearly: checked })
                }
              />
              <span>{newHoliday.isRecurringYearly ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            if (newHoliday.name && newHoliday.date) {
              setHolidays([...holidays, { ...newHoliday, id: Date.now() }]);
              setNewHoliday({
                date: "",
                name: "",
                isFullDay: true,
                startTime: "",
                endTime: "",
                isRecurringYearly: false,
              });
            }
          }}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Holiday
        </Button>

        {/* Holiday List */}
        <div className="space-y-2">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <span className="font-medium">{holiday.name}</span>
                <div className="text-sm text-gray-500">
                  <span>{holiday.date}</span>
                  {!holiday.isFullDay && (
                    <span>
                      {" "}
                      • {holiday.startTime} - {holiday.endTime}
                    </span>
                  )}
                  {holiday.isRecurringYearly && (
                    <span> • Recurring Yearly</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setHolidays(holidays.filter((h) => h.id !== holiday.id))
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Handle Add Service
  const handleAddService = () => {
    if (newService.name.trim()) {
      setServices([...services, { ...newService, id: Date.now() }]);
      setNewService({
        name: "",
        duration: "30",
        price: "",
        capacity: 1,
        color: "#4CAF50",
      });
    }
  };

  // Handle Add Staff
  const handleAddStaff = () => {
    if (newStaff.name.trim()) {
      setStaff([...staff, { ...newStaff, id: Date.now() }]);
      setNewStaff({
        name: "",
        services: [],
        workingHours: {
          monday: { start: "08:00", end: "17:00", isWorking: true },
          tuesday: { start: "08:00", end: "17:00", isWorking: true },
          wednesday: { start: "08:00", end: "17:00", isWorking: true },
          thursday: { start: "08:00", end: "17:00", isWorking: true },
          friday: { start: "08:00", end: "17:00", isWorking: true },
          saturday: { start: "08:00", end: "14:00", isWorking: true },
          sunday: { start: "00:00", end: "00:00", isWorking: false },
        },
        breaks: [],
      });
    }
  };

  // Staff Working Hours Component
  const StaffWorkingHours = ({ staffMember }) => {
    const weekDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    return (
      <div className="space-y-4">
        {weekDays.map((day) => (
          <div key={day} className="grid grid-cols-3 gap-4 items-center">
            <div className="capitalize">{day}</div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={staffMember.workingHours[day].isWorking}
                onCheckedChange={(checked) => {
                  const updatedStaff = staff.map((s) => {
                    if (s.id === staffMember.id) {
                      return {
                        ...s,
                        workingHours: {
                          ...s.workingHours,
                          [day]: {
                            ...s.workingHours[day],
                            isWorking: checked,
                          },
                        },
                      };
                    }
                    return s;
                  });
                  setStaff(updatedStaff);
                }}
              />
              <span>
                {staffMember.workingHours[day].isWorking ? "Working" : "Off"}
              </span>
            </div>
            {staffMember.workingHours[day].isWorking && (
              <div className="flex space-x-2">
                <Select
                  value={staffMember.workingHours[day].start}
                  onValueChange={(value) => {
                    const updatedStaff = staff.map((s) => {
                      if (s.id === staffMember.id) {
                        return {
                          ...s,
                          workingHours: {
                            ...s.workingHours,
                            [day]: {
                              ...s.workingHours[day],
                              start: value,
                            },
                          },
                        };
                      }
                      return s;
                    });
                    setStaff(updatedStaff);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue>
                      {staffMember.workingHours[day].start}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>-</span>
                <Select
                  value={staffMember.workingHours[day].end}
                  onValueChange={(value) => {
                    const updatedStaff = staff.map((s) => {
                      if (s.id === staffMember.id) {
                        return {
                          ...s,
                          workingHours: {
                            ...s.workingHours,
                            [day]: {
                              ...s.workingHours[day],
                              end: value,
                            },
                          },
                        };
                      }
                      return s;
                    });
                    setStaff(updatedStaff);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue>
                      {staffMember.workingHours[day].end}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="services">
            <Clock className="w-4 h-4 mr-2" />
            Services
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-2" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <AlertCircle className="w-4 h-4 mr-2" />
            Holidays
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Calendar</CardTitle>
              <CardDescription>View and manage your schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarView />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Services Management</CardTitle>
              <CardDescription>Add and manage your services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Service Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    placeholder="Service name"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={newService.duration}
                    onValueChange={(value) =>
                      setNewService({ ...newService, duration: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{newService.duration} min</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    placeholder="Capacity"
                    value={newService.capacity}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        capacity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={newService.color}
                    onChange={(e) =>
                      setNewService({ ...newService, color: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
              </div>
              <Button onClick={handleAddService} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>

              {/* Services List */}
              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    style={{ borderLeft: `4px solid ${service.color}` }}
                  >
                    <div className="flex-1">
                      <span className="font-medium">{service.name}</span>
                      <div className="text-sm text-gray-500">
                        <span>{service.duration} min</span>
                        {service.price && <span> • ${service.price}</span>}
                        <span> • Capacity: {service.capacity}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setServices(services.filter((s) => s.id !== service.id))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Add and manage your staff members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Staff Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Staff Name</Label>
                  <Input
                    placeholder="Staff name"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Services</Label>
                  <Select
                    value={newStaff.services}
                    onValueChange={(value) =>
                      setNewStaff({
                        ...newStaff,
                        services: [...newStaff.services, value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>Select services</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddStaff} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff Member
              </Button>

              {/* Staff List with Working Hours */}
              <div className="space-y-4">
                {staff.map((staffMember) => (
                  <div
                    key={staffMember.id}
                    className="bg-gray-50 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{staffMember.name}</span>
                        <div className="text-sm text-gray-500">
                          <span>Services: {staffMember.services.length}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setStaff(staff.filter((s) => s.id !== staffMember.id))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <StaffWorkingHours staffMember={staffMember} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle>Holiday Management</CardTitle>
              <CardDescription>
                Add and manage holidays and special hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HolidayManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure your organization's scheduling settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operating Hours Start</Label>
                  <Select
                    value={organizationSettings.startTime}
                    onValueChange={(value) =>
                      setOrganizationSettings({
                        ...organizationSettings,
                        startTime: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {organizationSettings.startTime}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Operating Hours End</Label>
                  <Select
                    value={organizationSettings.endTime}
                    onValueChange={(value) =>
                      setOrganizationSettings({
                        ...organizationSettings,
                        endTime: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{organizationSettings.endTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots("00:00", "23:59", 30).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Slot Duration (minutes)</Label>
                  <Select
                    value={organizationSettings.slotDuration.toString()}
                    onValueChange={(value) =>
                      setOrganizationSettings({
                        ...organizationSettings,
                        slotDuration: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {organizationSettings.slotDuration} min
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Concurrent Bookings</Label>
                  <Input
                    type="number"
                    value={organizationSettings.maxConcurrentBookings}
                    onChange={(e) =>
                      setOrganizationSettings({
                        ...organizationSettings,
                        maxConcurrentBookings: parseInt(e.target.value),
                      })
                    }
                    min="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedSchedulingApp;
