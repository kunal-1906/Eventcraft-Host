const express = require('express');
const router = express.Router();
const { checkJwt, checkUser, authorize } = require('../middleware/auth');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const notificationService = require('../services/notificationService');

// Public event routes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const category = req.query.category || '';
    
    let query = {
      // Only show approved and published events to public
      approvalStatus: 'approved',
      status: 'published'
    };
    
    // Search by title, description, or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Override status filter only if specific status requested
    if (status && status !== 'published') {
      query.status = status;
    }
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Event.countDocuments(query);
    
    res.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SPECIFIC ROUTES MUST COME BEFORE GENERIC /:id ROUTE

// Get upcoming events (for attendees)
router.get('/upcoming', async (req, res) => {
  try {
    const events = await Event.find({ 
      status: 'published',
      date: { $gte: new Date() }
    })
    .populate('organizer', 'name')
    .sort({ date: 1 })
    .limit(20);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get organizer's events
router.get('/organizer', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.dbUser._id })
      .sort({ createdAt: -1 });
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get popular events based on attendees
router.get('/popular', async (req, res) => {
  try {
    const events = await Event.find({
      approvalStatus: 'approved',
      status: 'published'
    })
      .sort({ 'attendees.length': -1 }) // fallback if attendanceCount not present
      .limit(4)
      .populate('organizer', 'name email');

    // Optional: sort manually if attendanceCount is not a separate field
    const sorted = events
      .map(event => ({
        ...event._doc,
        popularityScore: event.attendees.length // or use attendanceCount if available
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore);

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching popular events:', error);
    res.status(500).json({ message: 'Failed to fetch popular events' });
  }
});


// Get event analytics for organizer
router.get('/analytics', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const organizerId = req.dbUser._id;
    
    // Get organizer's events
    const events = await Event.find({ organizer: organizerId });
    const eventIds = events.map(e => e._id);
    
    // Get tickets for organizer's events
    const tickets = await Ticket.find({ event: { $in: eventIds } });
    
    // Calculate analytics
    const totalEvents = events.length;
    const totalAttendees = tickets.length;
    const totalRevenue = tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;
    
    // Get events by status
    const publishedEvents = events.filter(e => e.status === 'published').length;
    const draftEvents = events.filter(e => e.status === 'draft').length;
    const cancelledEvents = events.filter(e => e.status === 'cancelled').length;
    
    res.json({
      totalEvents,
      totalAttendees,
      totalRevenue,
      upcomingEvents,
      publishedEvents,
      draftEvents,
      cancelledEvents,
      events: events.slice(0, 5) // Return latest 5 events for dashboard
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin approval routes - MUST BE BEFORE /:id routes
router.get('/admin/pending', checkJwt, checkUser, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const events = await Event.find({ 
      $or: [
        { status: 'pending_approval' },
        { approvalStatus: 'pending', submittedForApproval: true }
      ]
    })
      .populate('organizer', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Event.countDocuments({ 
      $or: [
        { status: 'pending_approval' },
        { approvalStatus: 'pending', submittedForApproval: true }
      ]
    });
    
    res.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching pending events:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get approval statistics (Admin only)
router.get('/admin/approval-stats', checkJwt, checkUser, authorize('admin'), async (req, res) => {
  try {
    const pending = await Event.countDocuments({ 
      approvalStatus: 'pending',
      submittedForApproval: true 
    });
    
    const approved = await Event.countDocuments({ approvalStatus: 'approved' });
    const rejected = await Event.countDocuments({ approvalStatus: 'rejected' });
    const published = await Event.countDocuments({ status: 'published' });
    
    res.json({
      pending,
      approved,
      rejected,
      published,
      total: pending + approved + rejected
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NOW THE GENERIC /:id ROUTE
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees.user', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new event
router.post('/', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const { ticketTypes, ticketPrice, capacity } = req.body;
    
    const eventData = {
      ...req.body,
      organizer: req.dbUser._id,
      // Create default ticket type if none provided (matching eventcraft2 behavior)
      ticketTypes: ticketTypes || [{
        name: 'General Admission',
        price: ticketPrice || 0,
        description: 'Standard event admission',
        quantity: capacity || 100,
        quantitySold: 0
      }],
      // Admin can directly publish, organizers need approval (matching eventcraft2 behavior)
      status: req.dbUser.role === 'admin' ? 'published' : 'pending_approval',
      approvalStatus: req.dbUser.role === 'admin' ? 'approved' : 'pending',
      submittedForApproval: req.dbUser.role === 'organizer',
      submittedAt: req.dbUser.role === 'organizer' ? new Date() : undefined,
      approvedBy: req.dbUser.role === 'admin' ? req.dbUser._id : undefined,
      approvedAt: req.dbUser.role === 'admin' ? new Date() : undefined
    };
    
    const event = new Event(eventData);
    await event.save();
    
    // Populate organizer info for response
    await event.populate('organizer', 'name email');

    const responseMessage = req.dbUser.role === 'admin' 
      ? 'Event created and published successfully!'
      : 'Event created and submitted for admin approval!';

    res.status(201).json({
      message: responseMessage,
      event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update event
router.put('/:id', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is organizer or admin
    if (req.dbUser.role !== 'admin' && event.organizer.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('organizer', 'name email');
    
    // Send notification to all event attendees about the update
    if (updatedEvent.attendees && updatedEvent.attendees.length > 0) {
      const attendeeIds = updatedEvent.attendees.map(attendee => attendee.user);
      
      await notificationService.createBulkNotifications({
        users: attendeeIds,
        type: 'event_updated',
        title: 'Event Updated',
        message: `The event "${updatedEvent.title}" has been updated. Check the latest details.`,
        data: {
          eventId: updatedEvent._id,
          updatedAt: new Date()
        },
        priority: 'medium'
      });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete event
router.delete('/:id', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is organizer or admin
    if (req.dbUser.role !== 'admin' && event.organizer.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    
    // Send notification to all event attendees about cancellation
    if (event.attendees && event.attendees.length > 0) {
      const attendeeIds = event.attendees.map(attendee => attendee.user);
      
      await notificationService.createBulkNotifications({
        users: attendeeIds,
        type: 'event_cancelled',
        title: 'Event Cancelled',
        message: `Unfortunately, the event "${event.title}" has been cancelled. We apologize for any inconvenience.`,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          cancelledAt: new Date()
        },
        priority: 'high'
      });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit event for approval
router.put('/:id/submit', checkJwt, checkUser, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is organizer
    if (event.organizer.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to submit this event' });
    }
    
    event.submittedForApproval = true;
    event.submittedAt = new Date();
    event.status = 'pending_approval';
    event.approvalStatus = 'pending';
    
    await event.save();
    
    res.json({ message: 'Event submitted for approval', event });
  } catch (error) {
    console.error('Error submitting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve event (Admin only)
router.put('/:eventId/approve', checkJwt, checkUser, authorize('admin'), async (req, res) => {
  try {
    console.log('🔍 Starting event approval process...');
    
    // First, find and populate the event with organizer
    const event = await Event.findById(req.params.eventId).populate('organizer', 'name email preferences phone');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('📅 Event found:', event.title);
    console.log('📊 Current event status:', event.status);
    console.log('✅ Current approval status:', event.approvalStatus);
    console.log('📝 Submitted for approval:', event.submittedForApproval);
    
    if (!event.organizer) {
      console.log('❌ Event has no organizer assigned');
      return res.status(400).json({ message: 'Event has no organizer assigned' });
    }
    
    console.log('👤 Organizer:', event.organizer.name, event.organizer.email);
    console.log('📱 Phone:', event.organizer.phone || 'No phone number');
    console.log('⚙️ Full preferences object:', JSON.stringify(event.organizer.preferences, null, 2));
    
    // More flexible approval checking
    const isApprovable = (
      event.approvalStatus === 'pending' || 
      event.status === 'pending_approval' ||
      event.status === 'draft' ||
      event.submittedForApproval === true
    );
    
    console.log('🔍 Approval check details:', {
      'approvalStatus === pending': event.approvalStatus === 'pending',
      'status === pending_approval': event.status === 'pending_approval',
      'status === draft': event.status === 'draft',
      'submittedForApproval === true': event.submittedForApproval === true,
      'isApprovable': isApprovable
    });
    
    if (!isApprovable) {
      const errorMsg = `Event is not pending approval. Current status: ${event.status}, approval: ${event.approvalStatus}, submitted: ${event.submittedForApproval}`;
      console.log('❌ Approval check failed:', errorMsg);
      return res.status(400).json({ 
        message: errorMsg
      });
    }
    
    // Update event status
    event.approvalStatus = 'approved';
    event.status = 'published';
    event.approvedBy = req.dbUser._id;
    event.approvedAt = new Date();
    
    await event.save();
    console.log('✅ Event status updated to approved/published');
    
    // Send notification via new notification service
    try {
      await notificationService.createNotification({
        user: event.organizer._id,
        type: 'event_approved',
        title: 'Event Approved!',
        message: `Your event "${event.title}" has been approved and is now published.`,
        data: {
          eventId: event._id,
          approvedAt: event.approvedAt
        },
        priority: 'high'
      });
      console.log('✅ Approval notification created via notification service');
    } catch (error) {
      console.error('❌ Failed to create approval notification:', error);
    }
    
    // Send notifications to organizer (legacy support)
    const organizer = event.organizer;
    
    if (organizer) {
      console.log(`📧 Attempting to send approval notification to organizer: ${organizer.email}`);
      
      // Check preferences with detailed logging
      const emailPreference = organizer.preferences?.notifications?.email !== false;
      const smsPreference = organizer.preferences?.notifications?.sms === true;
      
      console.log('📧 Email preference check:', {
        'organizer.preferences': !!organizer.preferences,
        'organizer.preferences.notifications': !!organizer.preferences?.notifications,
        'email setting': organizer.preferences?.notifications?.email,
        'emailPreference result': emailPreference
      });
      
      console.log('📱 SMS preference check:', {
        'sms setting': organizer.preferences?.notifications?.sms,
        'phone available': !!organizer.phone,
        'smsPreference result': smsPreference
      });
      
      if (emailPreference) {
        try {
          console.log('📧 Attempting to send approval email...');
          const emailResult = await emailService.sendEventApprovalNotification(organizer, event);
          console.log(`✅ Approval email result:`, emailResult);
          console.log(`✅ Approval email sent to ${organizer.email}`);
        } catch (error) {
          console.error(`❌ Failed to send approval email to ${organizer.email}:`, error);
        }
      } else {
        console.log('📧 Email notifications disabled for this user or email preference is false');
      }
      
      if (smsPreference && organizer.phone) {
        try {
          console.log('📱 Attempting to send approval SMS...');
          const smsResult = await smsService.sendEventApprovalNotification(organizer, event);
          console.log(`✅ Approval SMS result:`, smsResult);
          console.log(`✅ Approval SMS sent to ${organizer.phone}`);
        } catch (error) {
          console.error(`❌ Failed to send approval SMS to ${organizer.phone}:`, error);
        }
      } else {
        if (!smsPreference) {
          console.log('📱 SMS notifications disabled for this user');
        }
        if (!organizer.phone) {
          console.log('📱 No phone number available for SMS');
        }
      }
    } else {
      console.log('❌ No organizer found for notifications');
    }
    
    res.json({
      message: 'Event approved and published successfully!',
      event
    });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject event (Admin only)
router.put('/:eventId/reject', checkJwt, checkUser, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const event = await Event.findById(req.params.eventId).populate('organizer', 'name email preferences phone');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    event.approvalStatus = 'rejected';
    event.status = 'rejected';
    event.rejectedBy = req.dbUser._id;
    event.rejectedAt = new Date();
    event.rejectionReason = reason;
    
    await event.save();
    
    // Send notification via new notification service
    try {
      await notificationService.createNotification({
        user: event.organizer._id,
        type: 'event_rejected',
        title: 'Event Rejected',
        message: `Your event "${event.title}" has been rejected. ${reason ? `Reason: ${reason}` : 'Please review and resubmit.'}`,
        data: {
          eventId: event._id,
          rejectedAt: event.rejectedAt,
          reason: reason || null
        },
        priority: 'high'
      });
      console.log('✅ Rejection notification created via notification service');
    } catch (error) {
      console.error('❌ Failed to create rejection notification:', error);
    }
    
    // Send rejection notification to organizer (legacy support)
    const organizer = event.organizer;
    
    if (organizer && organizer.preferences?.notifications?.email !== false) {
      try {
        await emailService.sendEmail({
          to: organizer.email,
          subject: `Event Rejected: ${event.title}`,
          html: `
            <h1>❌ Your event has been rejected</h1>
            <p>Hello ${organizer.name},</p>
            <p>Unfortunately, your event <strong>${event.title}</strong> has been rejected.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You can make the necessary changes and resubmit your event for approval.</p>
            <p>Thank you for using EventCraft!</p>
          `
        });
        console.log(`✅ Rejection email sent to ${organizer.email}`);
      } catch (error) {
        console.error(`❌ Failed to send rejection email:`, error);
      }
    }
    
    res.json({
      message: 'Event rejected successfully',
      event
    });
  } catch (error) {
    console.error('Error rejecting event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Event registration route
router.post('/:id/register', checkJwt, checkUser, async (req, res) => {
  try {
    const { ticketType, quantity = 1 } = req.body;
    const eventId = req.params.id;
    
    console.log(`📧 User ${req.dbUser.email} registering for event ${eventId}`);
    
    const event = await Event.findById(eventId).populate('organizer', 'name email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event is not available for registration' });
    }
    
    // Allow multiple ticket purchases - remove the restriction
    // Users can buy multiple tickets for the same event
    console.log(`✅ Allowing multiple ticket purchase for user ${req.dbUser.email}`);
    
    // Check capacity using actual ticket count
    const existingTicketsCount = await Ticket.countDocuments({ event: eventId });
    console.log(`🎫 Current tickets sold: ${existingTicketsCount}`);
    console.log(`🏢 Event capacity: ${event.capacity}`);
    console.log(`📊 Requested quantity: ${quantity}`);
    
    if (existingTicketsCount + quantity > event.capacity) {
      return res.status(400).json({ 
        message: `Event is at full capacity. ${event.capacity - existingTicketsCount} tickets remaining.`,
        available: event.capacity - existingTicketsCount,
        requested: quantity
      });
    }
    
    console.log(`✅ Creating tickets for user ${req.dbUser.email}`);
    
    // Find the correct ticket type and price
    const selectedTicketType = ticketType || 'General Admission';
    let ticketPrice = 0;
    
    // Try to find price from ticketTypes array first
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      const foundTicketType = event.ticketTypes.find(tt => tt.name === selectedTicketType);
      if (foundTicketType) {
        ticketPrice = foundTicketType.price || 0;
        console.log(`💰 Found ticket type "${selectedTicketType}" with price: $${ticketPrice}`);
      } else {
        // Use the first ticket type as default
        ticketPrice = event.ticketTypes[0].price || 0;
        console.log(`💰 Using default ticket type with price: $${ticketPrice}`);
      }
    } else {
      // Fallback to event.ticketPrice
      ticketPrice = event.ticketPrice || 0;
      console.log(`💰 Using event ticket price: $${ticketPrice}`);
    }
    
    console.log(`🎫 Creating ${quantity} tickets at $${ticketPrice} each`);
    
    // Create ticket(s) with enhanced information
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      // Generate unique ticket number manually (since insertMany doesn't trigger pre-save middleware)
      const year = new Date().getFullYear();
      const randomNum = Math.random().toString(36).substr(2, 8).toUpperCase();
      const ticketNumber = `TCK-${year}-${randomNum}`;
      
      // Generate unique QR code data for each ticket
      const qrData = {
        eventId: eventId,
        userId: req.dbUser._id,
        ticketType: ticketType || 'General Admission',
        timestamp: Date.now(),
        ticketIndex: i + 1
      };
      
      const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`;
      
      const ticket = new Ticket({
        event: eventId,
        user: req.dbUser._id,
        ticketNumber: ticketNumber, // Set ticket number manually
        ticketType: selectedTicketType,
        price: ticketPrice, // Use the correct ticket price
        quantity: 1, // Each ticket represents 1 admission
        status: 'confirmed',
        purchaseDate: new Date(),
        paymentMethod: ticketPrice > 0 ? 'card' : 'free', // Set payment method based on price
        paymentStatus: 'completed',
        qrCode: qrCodeUrl, // Generate QR code immediately
        metadata: {
          registrationSource: 'web',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        }
      });
      tickets.push(ticket);
    }
    
    const savedTickets = await Ticket.insertMany(tickets);
    console.log(`✅ Created ${savedTickets.length} tickets`);
    console.log(`📋 Ticket numbers: ${savedTickets.map(t => t.ticketNumber).join(', ')}`);

    // Add user to event attendees
    event.attendees.push({
      user: req.dbUser._id,
      ticketType: selectedTicketType,
      purchaseDate: new Date(),
      checkedIn: false
    });
    
    await event.save();
    console.log(`✅ Added user to event attendees`);

    // Get user with preferences for notifications
    const user = await User.findById(req.dbUser._id);
    
    console.log(`📧 Sending registration confirmation to: ${user.email}`);
    console.log(`⚙️ User preferences:`, user.preferences);
    
    // Send notification using the new notification service
    try {
      await notificationService.sendEventRegistrationConfirmation(
        req.dbUser._id,
        eventId,
        savedTickets[0]._id
      );
      console.log(`✅ Registration confirmation notification sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send notification:`, error);
    }
        
    // Legacy email sending (keeping for backward compatibility)
    if (user.preferences?.notifications?.email !== false) {
      try {
        await emailService.sendEventConfirmation(user, event);
        console.log(`✅ Legacy registration confirmation email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send legacy confirmation email:`, error);
      }
    }
        
    // Legacy SMS sending (keeping for backward compatibility)
    if (user.preferences?.notifications?.sms === true && user.phone) {
      try {
        await smsService.sendEventConfirmation(user, event);
        console.log(`✅ Legacy registration confirmation SMS sent to ${user.phone}`);
      } catch (error) {
        console.error(`❌ Failed to send legacy confirmation SMS:`, error);
      }
    }
    
    res.status(201).json({ 
      message: 'Registration successful', 
      tickets: savedTickets,
      totalPrice: ticketPrice * quantity,
      pricePerTicket: ticketPrice,
      event: {
        title: event.title,
        date: event.date,
        location: event.location
      }
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Get event attendees (for organizers)
router.get('/:id/attendees', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId)
      .populate('attendees.user', 'name email phone')
      .populate('organizer', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is organizer or admin
    if (req.dbUser.role !== 'admin' && event.organizer._id.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view attendees' });
    }
    
    // Get tickets for this event with user details
    const tickets = await Ticket.find({ event: eventId })
      .populate('user', 'name email phone')
      .sort({ purchaseDate: -1 });
    
    res.json({
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        capacity: event.capacity
      },
      attendees: tickets.map(ticket => ({
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        user: ticket.user,
        ticketType: ticket.ticketType,
        purchaseDate: ticket.purchaseDate,
        status: ticket.status,
        checkedIn: ticket.status === 'used',
        checkInDate: ticket.checkInDate
      })),
      stats: {
        totalAttendees: tickets.length,
        checkedIn: tickets.filter(t => t.status === 'used').length,
        capacity: event.capacity,
        occupancyRate: ((tickets.length / event.capacity) * 100).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single event analytics (for organizers)
router.get('/:id/analytics', checkJwt, checkUser, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId).populate('organizer', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is organizer or admin
    if (req.dbUser.role !== 'admin' && event.organizer._id.toString() !== req.dbUser._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view analytics' });
    }
    
    // Get tickets for this event
    const tickets = await Ticket.find({ event: eventId });
    
    // Calculate detailed analytics
    const totalTicketsSold = tickets.length;
    const totalRevenue = tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
    const checkedInCount = tickets.filter(t => t.status === 'used').length;
    const cancelledCount = tickets.filter(t => t.status === 'cancelled').length;
    
    // Registration trends (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayTickets = tickets.filter(t => 
        new Date(t.purchaseDate) >= dayStart && new Date(t.purchaseDate) <= dayEnd
      );
      
      last7Days.push({
        date: dayStart.toISOString().split('T')[0],
        registrations: dayTickets.length,
        revenue: dayTickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0)
      });
    }
    
    res.json({
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        status: event.status,
        capacity: event.capacity
      },
      summary: {
        totalTicketsSold,
        totalRevenue,
        checkedInCount,
        cancelledCount,
        occupancyRate: ((totalTicketsSold / event.capacity) * 100).toFixed(1),
        checkInRate: totalTicketsSold > 0 ? ((checkedInCount / totalTicketsSold) * 100).toFixed(1) : 0
      },
      trends: {
        last7Days,
        peakRegistrationDay: last7Days.reduce((peak, day) => 
          day.registrations > peak.registrations ? day : peak, last7Days[0])
      },
      ticketTypes: tickets.reduce((acc, ticket) => {
        const type = ticket.ticketType || 'General';
        if (!acc[type]) {
          acc[type] = { count: 0, revenue: 0 };
        }
        acc[type].count++;
        acc[type].revenue += ticket.price || 0;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get event calendar (ICS format)
router.get('/:id/calendar', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Generate ICS file content
    const startDate = new Date(event.date);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours duration
    
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventCraft//EventCraft Calendar//EN
BEGIN:VEVENT
UID:${event._id}@eventcraft.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
ORGANIZER:CN=${event.organizer?.name || 'EventCraft'}:MAILTO:${event.organizer?.email || 'noreply@eventcraft.com'}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

    res.set({
      'Content-Type': 'text/calendar',
      'Content-Disposition': `attachment; filename="${event.title.replace(/\s+/g, '-')}.ics"`
    });
    
    res.json({
      icsFile: icsContent,
      filename: `${event.title.replace(/\s+/g, '-')}.ics`
    });
  } catch (error) {
    console.error('Error generating calendar file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get event capacity information
router.get('/:id/capacity', async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Count actual tickets sold
    const ticketsSold = await Ticket.countDocuments({ event: eventId });
    
    // Count attendees in event.attendees array for comparison
    const attendeesCount = event.attendees ? event.attendees.length : 0;
    
    res.json({
      eventId: event._id,
      eventTitle: event.title,
      capacity: event.capacity,
      ticketsSold: ticketsSold,
      attendeesInArray: attendeesCount,
      available: event.capacity - ticketsSold,
      occupancyRate: ((ticketsSold / event.capacity) * 100).toFixed(1) + '%'
    });
  } catch (error) {
    console.error('Error fetching event capacity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
