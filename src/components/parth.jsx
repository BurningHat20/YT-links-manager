import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Edit2, Plus, X, Check, Save } from "lucide-react";

const HaircutScheduler = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [capacity, setCapacity] = useState(1);

  const [timeSlots, setTimeSlots] = useState([
    { id: 1, time: "08:00 - 09:00", enabled: true, booked: false },
    { id: 2, time: "09:00 - 10:00", enabled: true, booked: false },
    { id: 3, time: "10:00 - 11:00", enabled: true, booked: false },
  ]);

  const [weekDays, setWeekDays] = useState([
    { id: 1, day: "MON", status: "booked" },
    { id: 2, day: "TUE", status: "booked" },
    { id: 3, day: "WED", status: "booked" },
    { id: 4, day: "THU", status: "booked" },
    { id: 5, day: "FRI", status: "booked" },
    { id: 6, day: "SAT", status: "available" },
    { id: 7, day: "SUN", status: "available" },
  ]);

  const toggleDayStatus = (dayId) => {
    if (!isEditing) return;
    setWeekDays(
      weekDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              status: day.status === "available" ? "booked" : "available",
            }
          : day
      )
    );
  };

  const toggleTimeSlot = (timeId) => {
    if (!isEditing) return;
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === timeId ? { ...slot, booked: !slot.booked } : slot
      )
    );
  };

  const toggleTimeSlotEnabled = (timeId) => {
    setTimeSlots(
      timeSlots.map((slot) =>
        slot.id === timeId ? { ...slot, enabled: !slot.enabled } : slot
      )
    );
  };

  const handleCapacityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setCapacity(Math.max(1, Math.min(10, value)));
  };

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to backend
  };

  return (
    <div className="p-4">
      <Card className="w-full max-w-md mx-auto bg-white shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Hair Cut</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsEditing(!isEditing)}
              className="h-8 w-8"
            >
              {isEditing ? (
                <Save className="h-4 w-4" />
              ) : (
                <Edit2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Capacity:</span>
            {isEditing ? (
              <Input
                type="number"
                value={capacity}
                onChange={handleCapacityChange}
                className="w-20 h-8"
                min="1"
                max="10"
              />
            ) : (
              <Badge variant="secondary">{capacity}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Week Days */}
          <div className="grid grid-cols-4 gap-2">
            {weekDays.map(({ id, day, status }) => (
              <Button
                key={id}
                variant={status === "available" ? "outline" : "secondary"}
                className={`w-full ${
                  status === "available"
                    ? "border-green-500 text-green-600"
                    : "opacity-50"
                } ${isEditing ? "cursor-pointer" : ""}`}
                onClick={() => toggleDayStatus(id)}
                disabled={!isEditing && status === "booked"}
              >
                {day}
                {status === "available" ? " +" : " ×"}
              </Button>
            ))}
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            {timeSlots.map(({ id, time, booked, enabled }) => (
              <div
                key={id}
                className={`flex items-center justify-between p-3 border rounded-lg 
                  ${
                    !enabled
                      ? "bg-gray-100"
                      : isEditing
                      ? "cursor-pointer hover:bg-gray-50"
                      : booked
                      ? "opacity-50"
                      : "hover:bg-gray-50"
                  } 
                  transition-colors`}
              >
                <div
                  className="flex items-center flex-1"
                  onClick={() => enabled && toggleTimeSlot(id)}
                >
                  <Clock className="h-4 w-4" />
                  <span className="ml-3">{time}</span>
                  {isEditing && enabled && (
                    <span className="ml-auto mr-4">
                      {booked ? (
                        <X className="h-4 w-4 text-red-500" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleTimeSlotEnabled(id)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <X className="h-4 w-4 text-red-500" /> Booked
            </span>
            <span className="flex items-center gap-1">
              <Plus className="h-4 w-4 text-green-500" /> Available
            </span>
            {isEditing && (
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 rounded-sm" /> Disabled
              </span>
            )}
          </div>

          {/* Save Button (visible only in edit mode) */}
          {isEditing && (
            <Button className="w-full" onClick={handleSave}>
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HaircutScheduler;
