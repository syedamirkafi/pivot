import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, isAfter, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Plus, Sparkles, Calendar, Clock, Tag, FileText, X, Check, Edit2, Filter, AlertCircle, CalendarRange } from 'lucide-react';
import { User } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from '../firebase';
import { CalendarEvent } from '../types';

export function CalendarPage({ user }: { user: User }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formType, setFormType] = useState<CalendarEvent['type']>('Interview');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  
  // Filter state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Listen to Firestore events in real-time
  useEffect(() => {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents: CalendarEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedEvents.push({
          id: docSnap.id,
          title: data.title,
          date: data.date,
          time: data.time,
          type: data.type,
          description: data.description || '',
          userId: data.userId,
          createdAt: data.createdAt
        });
      });
      // Sort chronologically by date and then time
      loadedEvents.sort((a, b) => {
        const dateTimeA = `${a.date}T${a.time}`;
        const dateTimeB = `${b.date}T${b.time}`;
        return dateTimeA.localeCompare(dateTimeB);
      });
      setEvents(loadedEvents);
      setLoading(false);
    }, (error) => {
      try { handleFirestoreError(error, OperationType.LIST, 'events'); } catch (e) { /* handled */ }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleOpenAddModal = (dateToSet: Date) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormTime('09:00');
    setFormType('Interview');
    setFormDescription('');
    setFormDate(format(dateToSet, 'yyyy-MM-dd'));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormTime(event.time);
    setFormType(event.type);
    setFormDescription(event.description || '');
    setFormDate(event.date);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    const eventPayload: Omit<CalendarEvent, 'id'> = {
      title: formTitle.trim(),
      date: formDate,
      time: formTime || '09:00',
      type: formType,
      description: formDescription.trim(),
      userId: user.uid,
      createdAt: editingEvent ? editingEvent.createdAt : Date.now()
    };

    try {
      console.log("Saving event...", eventPayload);
      if (editingEvent?.id) {
        // Update existing event
        const docRef = doc(db, 'events', editingEvent.id);
        await updateDoc(docRef, eventPayload);
        console.log("Event updated.");
      } else {
        // Create new event
        await addDoc(collection(db, 'events'), eventPayload);
        console.log("Event created.");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving event:", error);
      try { handleFirestoreError(error, editingEvent ? OperationType.UPDATE : OperationType.CREATE, 'events'); } catch (e) { /* handled */ }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      try { handleFirestoreError(error, OperationType.DELETE, 'events'); } catch (e) { /* handled */ }
    }
  };

  // Helper presets for fast form filling
  const applyPreset = (presetTitle: string, presetType: CalendarEvent['type']) => {
    setFormTitle(presetTitle);
    setFormType(presetType);
  };

  // Get events on a specific day
  const getEventsForDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === formattedDate);
  };

  // Type styling utilities
  const getTypeStyles = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Interview':
        return {
          dot: 'bg-emerald-500',
          badge: 'bg-emerald-500/10 text-[#10B981] border-emerald-500/20',
          leftBorder: 'border-l-4 border-l-emerald-500',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/5'
        };
      case 'Deadline':
        return {
          dot: 'bg-rose-500',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          leftBorder: 'border-l-4 border-l-rose-500',
          text: 'text-rose-400',
          bg: 'bg-rose-500/5'
        };
      case 'Networking':
        return {
          dot: 'bg-amber-500',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          leftBorder: 'border-l-4 border-l-amber-500',
          text: 'text-amber-400',
          bg: 'bg-amber-500/5'
        };
      case 'Preparation':
        return {
          dot: 'bg-purple-500',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          leftBorder: 'border-l-4 border-l-purple-500',
          text: 'text-purple-400',
          bg: 'bg-purple-500/5'
        };
      default:
        return {
          dot: 'bg-blue-400',
          badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
          leftBorder: 'border-l-4 border-l-blue-400',
          text: 'text-blue-400',
          bg: 'bg-blue-400/5'
        };
    }
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (selectedTypeFilter === 'All') return true;
    return e.type === selectedTypeFilter;
  });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = filteredEvents.filter(e => e.date === selectedDateStr);
  const upcomingEvents = filteredEvents.filter(e => {
    // Show events starting today and onwards
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return e.date >= todayStr;
  }).slice(0, 5); // Limit upcoming agenda to next 5 items

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in text-gray-200 max-w-6xl mx-auto px-4 lg:px-6">
      {/* Page Header */}
      <header className="shrink-0 flex justify-between items-center border-b border-white/10 pb-6 mb-2">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#10B981] flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[#10B981]" /> CALENDAR
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-1.5 text-xs font-mono text-[#10B981]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> INTERVIEW SCHEDULER
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* Left Column: Interactive Calendar (spanning 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#111113] border border-white/10 rounded-none p-5 relative overflow-hidden">
            {/* Top Navigation */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-mono font-bold text-white tracking-wider uppercase">
                  {format(currentDate, 'MMMM')}{' '}
                  <span className="text-gray-500 font-normal">{format(currentDate, 'yyyy')}</span>
                </h2>
                <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">Click any day to manage plans</p>
              </div>
              <div className="flex gap-1.5 bg-white/5 p-1 border border-white/5">
                <button 
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
                  className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-none cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2 text-[10px] font-mono text-gray-400 hover:text-white hover:bg-white/10 transition-all rounded-none border-x border-white/5 uppercase"
                >
                  Today
                </button>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
                  className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-none cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold text-gray-500 mb-2 py-1 bg-white/5 border-y border-white/5">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            {!loading && (
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayEventsList = getEventsForDate(day);
                  const isDaySelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isDayToday = isToday(day);

                  return (
                    <button 
                      key={day.toString()} 
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => handleOpenAddModal(day)}
                      className={`relative min-h-[60px] p-2 flex flex-col justify-between items-start transition-all border border-transparent rounded-none cursor-pointer group text-left ${
                        !isCurrentMonth 
                          ? 'bg-[#111113]/30 text-gray-600 opacity-35 hover:opacity-75' 
                          : 'bg-white/[0.02] hover:bg-white/[0.06] text-gray-300'
                      } ${
                        isDaySelected 
                          ? 'bg-[#10B981]/10 border-[#10B981] text-white font-bold' 
                          : isDayToday 
                            ? 'border-[#10B981]/40 bg-white/5' 
                            : 'border-white/5'
                      }`}
                    >
                      {/* Day Number */}
                      <span className={`text-xs font-mono ${isDayToday && !isDaySelected ? 'text-[#10B981] font-bold underline decoration-2' : ''}`}>
                        {format(day, 'd')}
                      </span>

                      {/* Day Event Dots */}
                      {dayEventsList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 w-full max-w-full overflow-hidden">
                          {dayEventsList.slice(0, 4).map((event) => {
                            const styles = getTypeStyles(event.type);
                            return (
                              <span 
                                key={event.id} 
                                className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} 
                                title={`${event.time} - ${event.title}`}
                              />
                            );
                          })}
                          {dayEventsList.length > 4 && (
                            <span className="text-[8px] leading-none font-mono text-gray-500 font-bold">
                              +{dayEventsList.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div className="bg-[#111113] border border-white/10 rounded-none p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-xs uppercase text-gray-400">Filter Schedule:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Interview', 'Deadline', 'Networking', 'Preparation', 'Other'].map(type => {
                const isSelected = selectedTypeFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-2.5 py-1 text-[10px] font-mono rounded-none uppercase transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#10B981] text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Day Details & Upcoming Agenda (spanning 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Day details */}
          <div className="bg-[#111113] border border-white/10 rounded-none p-5 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
              <div>
                <div className="text-4xl font-light text-white font-sans tracking-tight mb-0.5">
                  {format(selectedDate, 'dd')}{' '}
                  <span className="text-lg text-gray-500 uppercase font-mono">{format(selectedDate, 'MMM')}</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#10B981] uppercase tracking-wider">
                  {format(selectedDate, 'EEEE')}
                </div>
              </div>
              <button 
                onClick={() => handleOpenAddModal(selectedDate)} 
                className="px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/20 hover:bg-[#10B981]/20 text-[#10B981] hover:border-[#10B981]/40 text-xs font-mono font-bold rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> ADD EVENT
              </button>
            </div>

            {/* Event List on Selected Date */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
              {dayEvents.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center border border-dashed border-white/10 p-4 text-center">
                  <CalendarRange className="w-8 h-8 text-gray-600 mb-2" />
                  <span className="text-xs font-mono text-gray-500 uppercase">No events filtered/scheduled</span>
                  <button 
                    onClick={() => handleOpenAddModal(selectedDate)}
                    className="text-[10px] font-mono text-[#10B981] underline mt-1.5 hover:text-emerald-300"
                  >
                    Click to add first event
                  </button>
                </div>
              ) : (
                dayEvents.map(event => {
                  const styles = getTypeStyles(event.type);
                  return (
                    <div 
                      key={event.id} 
                      className={`p-3 bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all rounded-none flex flex-col justify-between gap-2 relative ${styles.leftBorder}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border uppercase ${styles.badge}`}>
                              {event.type}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {event.time}
                            </span>
                          </div>
                          <h4 className="font-mono font-bold text-sm text-white">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenEditModal(event)}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-none cursor-pointer"
                            title="Edit event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => event.id && handleDeleteEvent(event.id)}
                            className="p-1 hover:bg-white/10 text-gray-400 hover:text-rose-400 transition-all rounded-none cursor-pointer"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {event.description && (
                        <p className="text-[11px] font-mono text-gray-400 border-t border-white/5 pt-2 mt-1 whitespace-pre-wrap">
                          {event.description}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Agenda Feed */}
          <div className="bg-[#111113] border border-white/10 rounded-none p-5 flex flex-col">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10B981]" /> UPCOMING AGENDA
            </h3>
            
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-gray-500 uppercase">
                  No upcoming items
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const styles = getTypeStyles(event.type);
                  const parsedDate = parseISO(event.date);
                  return (
                    <div 
                      key={event.id}
                      onClick={() => {
                        setSelectedDate(parsedDate);
                        setCurrentDate(parsedDate);
                      }}
                      className="group cursor-pointer p-2.5 bg-white/[0.01] hover:bg-white/5 border border-white/5 hover:border-[#10B981]/30 transition-all flex items-center justify-between gap-3 rounded-none"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Day / Month badge */}
                        <div className="shrink-0 w-11 h-11 bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center font-mono group-hover:border-[#10B981]/50 group-hover:bg-[#10B981]/5 transition-all">
                          <span className="text-xs font-bold text-white">{format(parsedDate, 'dd')}</span>
                          <span className="text-[8px] text-gray-500 uppercase">{format(parsedDate, 'MMM')}</span>
                        </div>
                        
                        <div className="overflow-hidden">
                          <h4 className="font-mono text-xs font-bold text-gray-200 group-hover:text-white truncate transition-colors">
                            {event.title}
                          </h4>
                          <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-[#10B981]" /> {event.time} • <span className={styles.text}>{event.type}</span>
                          </span>
                        </div>
                      </div>
                      
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Elegant Event Creator/Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="w-full max-w-md bg-[#111113] border border-white/15 p-6 space-y-6 animate-fade-in rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-mono font-bold text-md text-[#10B981] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#10B981]" />
                {editingEvent ? 'Edit Scheduled Event' : 'Schedule New Event'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white p-1 transition-colors rounded-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="space-y-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Event Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Technical Interview Prep, Coffee Chat"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-none p-2.5 text-xs font-mono text-white focus:border-[#10B981] focus:outline-none"
                />
              </div>

              {/* Fast Presets */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-wider">Presets</label>
                <div className="flex flex-wrap gap-1">
                  <button 
                    type="button" 
                    onClick={() => applyPreset('Phone Screening', 'Interview')}
                    className="px-2 py-1 bg-white/5 border border-white/5 hover:border-emerald-500/40 text-[9px] font-mono text-emerald-400"
                  >
                    + Phone Screen
                  </button>
                  <button 
                    type="button" 
                    onClick={() => applyPreset('Technical Interview', 'Interview')}
                    className="px-2 py-1 bg-white/5 border border-white/5 hover:border-emerald-500/40 text-[9px] font-mono text-emerald-400"
                  >
                    + Tech Interview
                  </button>
                  <button 
                    type="button" 
                    onClick={() => applyPreset('Application Deadline', 'Deadline')}
                    className="px-2 py-1 bg-white/5 border border-white/5 hover:border-rose-500/40 text-[9px] font-mono text-rose-400"
                  >
                    + Deadline
                  </button>
                  <button 
                    type="button" 
                    onClick={() => applyPreset('System Design Review', 'Preparation')}
                    className="px-2 py-1 bg-white/5 border border-white/5 hover:border-purple-500/40 text-[9px] font-mono text-purple-400"
                  >
                    + Prep System
                  </button>
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Date</label>
                  <input 
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none p-2.5 text-xs font-mono text-white focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Time</label>
                  <input 
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-none p-2.5 text-xs font-mono text-white focus:border-[#10B981] focus:outline-none"
                  />
                </div>
              </div>

              {/* Event Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Event Category</label>
                <select 
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CalendarEvent['type'])}
                  className="w-full bg-white/5 border border-white/10 rounded-none p-2.5 text-xs font-mono text-white focus:border-[#10B981] focus:outline-none"
                >
                  <option value="Interview" className="bg-[#111113] text-emerald-400">Interview</option>
                  <option value="Deadline" className="bg-[#111113] text-rose-400">Deadline</option>
                  <option value="Networking" className="bg-[#111113] text-amber-400">Networking</option>
                  <option value="Preparation" className="bg-[#111113] text-purple-400">Preparation</option>
                  <option value="Other" className="bg-[#111113] text-blue-400">Other</option>
                </select>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Notes & Prep details</label>
                <textarea 
                  placeholder="Insert links, preparation topics, questions, contacts, or calendar invites here..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-none p-2.5 text-xs font-mono text-white focus:border-[#10B981] focus:outline-none resize-none"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs font-mono font-bold rounded-none transition-all cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#10B981]/90 text-black text-xs font-mono font-bold rounded-none transition-all cursor-pointer text-center"
                >
                  {editingEvent ? 'SAVE CHANGES' : 'SCHEDULE EVENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
