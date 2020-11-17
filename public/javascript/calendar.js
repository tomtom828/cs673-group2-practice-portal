document.addEventListener('DOMContentLoaded', function() {

  // Get Sunday of Today's Week
  // var startOfCalander = GetCurrentWeekSunday().toJSON().slice(0,10);

  // Create Calendar
  var calendarEl = document.getElementById('calendar');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    initialView: 'timeGridWeek',
    // initialDate: startOfCalander,
    navLinks: true, // can click day/week names to navigate views
    nowIndicator: true,

    weekNumbers: true,
    weekNumberCalculation: 'ISO',

    editable: false, // cannot drag events
    selectable: true,

    // Add Available Time for given doctor
    select: function(arg) {

      var addNewEvent = confirm('Add a New Appointment Time Slot?');
      if (addNewEvent) {

        // Get Date & Time Ranges
        var startMonth = arg.start.getMonth() + 1;
        var startDay = arg.start.getDate();
        var startHour = arg.start.getHours();
        var startMinute = arg.start.getMinutes();
        var endMonth = arg.end.getMonth() + 1;
        var endDay = arg.end.getDate();
        var endHour = arg.end.getHours();
        var endMinute = arg.end.getMinutes();

        // Call External API via helper
        UpdateDoctorAvailability(startMonth, startDay, startHour, startMinute,
          endMonth, endDay, endHour, endMinute, function(res, err) {

            // Alert if error
            if (err) {
              alert("Unable to new Availablity!");
              console.log(err);
            }
            // Otherwise, append to Calendar
            else {
              calendar.addEvent({
                title: 'Available',
                start: arg.start,
                end: arg.end,
                className: 'pp-calendar-open'
              });
            }
          });
      }
      calendar.unselect()
    },

    // Get new Events on Render or Re-Render of Calendar
    datesSet: function(arg) {

      // Clear any old Events
      ClearAllCalendarEvents(calendar);

      // Get Date Ranges
      var startMonth = arg.start.getMonth() + 1;
      var startDay = arg.start.getDate();
      var endMonth = arg.end.getMonth() + 1;
      var endDay = arg.end.getDate();

      console.log(startDay)
      console.log(endDay)

      // Call Helper Method to hit API and add all events to calendar within date range
      _this = this;
      GetDoctorEventsByDateRange(startMonth, startDay, endMonth, endDay, function(data) {
        for (var _event of data) {
          _this.addEvent(_event);
        }
      });
    },

    // Clicked Event, Triggers Modal
    eventClick: function(arg) {

      // Determine Type of Event
      var eventClassNames = arg.el.className;

      // Open Appointment
      if (eventClassNames.includes("pp-calendar-open")) {

        // Get Required Data Elements
        var appointmentId = arg.event.id;
        var startTime = arg.event.start;
        var endTime = arg.event.end;
        var doctorName = $("#select-doctor option:selected").text();

        // Update Modal
        $("#openAptModal-label-apt-id").val(appointmentId);
        $("#openAptModal-label-date-start-time").val(startTime);
        $("#openAptModal-label-date-end-time").val(endTime);
        $("#openAptModal-label-doctor-name").val(doctorName);

        // Show modal
        $('#openAptModal').modal('show');

      }

      // Booked Appointment
      else if (eventClassNames.includes("pp-calendar-booked")) {

        // Get Required Data Elements
        var appointmentId = arg.event.id;
        var startTime = arg.event.start;
        var endTime = arg.event.end;
        var doctorName = $("#select-doctor option:selected").text();
        var patientName = arg.event.title;
        var isTeleVisit = arg.event.extendedProps.isTeleVisit;
        console.log(isTeleVisit)

        // Update Modal
        $("#bookedAptModal-label-apt-id").val(appointmentId);
        $("#bookedAptModal-label-date-start-time").val(startTime);
        $("#bookedAptModal-label-date-end-time").val(endTime);
        $("#bookedAptModal-label-doctor-name").val(doctorName);
        $("#bookedAptModal-label-patient-name").val(patientName);
        if (isTeleVisit) {
          $("#bookedAptModal-televisit").show(); // show button for tele visit
          $("#bookedAptModal-label-apt-type").empty();
          $("#bookedAptModal-label-apt-type").append('<option value="true">Tele-Visit</option>');
        }
        else {
          $("#bookedAptModal-televisit").hide(); // hide button for tele visit
          $("#bookedAptModal-label-apt-type").empty();
          $("#bookedAptModal-label-apt-type").append('<option value="false">In-Person</option>');

        }

        // Show modal
        $('#bookedAptModal').modal('show');

      }

      // Cancelled Appointment
      else if (eventClassNames.includes("pp-calendar-cancelled")) {

        // Get Required Data Elements
        var appointmentId = arg.event.id;
        var startTime = arg.event.start;
        var endTime = arg.event.end;
        var doctorName = $("#select-doctor option:selected").text();
        var patientName = arg.event.extendedProps.patientName;
        var cancelledByName = arg.event.extendedProps.cancelledByName;
        var appointmentType = arg.event.extendedProps.appointmentType;

        // Update Modal
        $("#cancelledAptModal-label-apt-id").val(appointmentId);
        $("#cancelledAptModal-label-date-start-time").val(startTime);
        $("#cancelledAptModal-label-date-end-time").val(endTime);
        $("#cancelledAptModal-label-doctor-name").val(doctorName);
        $("#cancelledAptModal-label-patient-name").val(patientName);
        $("#cancelledAptModal-label-cancelledByName").val(cancelledByName);
        $("#cancelledAptModal-label-apt-type").val(appointmentType);

        // Show modal
        $('#cancelledAptModal').modal('show');
      }

      // Invalid Condition
      else {
        console.log("Invalid Option!");
        console.log(arg);
      }

    },
    dayMaxEvents: true, // allow "more" link when too many events
    events: [] // This gets set each time the calender mounts

  });

  // Create Doctor Selector
  $.ajax({
    type: "GET",
    url: UI_HELPER_API + "/doctors",
    data: {},
    success: function(res) {
      // Iterate over response and append to DOM
      for (var i=0; i < res.length; i++) {
        console.log(res[i])
        $("#select-doctor").append('<option value="' + res[i].doctorId + '">' + res[i].doctorName + '</option>');
      }
      // Render Calendar
      calendar.render();
    }
  });


  // Calendar Helper: Dr Name was Changed
  $("#select-doctor").change(function(){

    // Clear any old Events
    ClearAllCalendarEvents(calendar);

    // Get Date Ranges
    var startMonth = calendar.view.getCurrentData().dateProfile.currentRange.start.getMonth() + 1;
    var startDay = calendar.view.getCurrentData().dateProfile.currentRange.start.getDate();
    var endMonth = calendar.view.getCurrentData().dateProfile.currentRange.end.getMonth() + 1;
    var endDay = calendar.view.getCurrentData().dateProfile.currentRange.end.getDate();

    // Call Helper Method to hit API and add all events to calendar within date range
    GetDoctorEventsByDateRange(startMonth, startDay, endMonth, endDay, function(data) {
      console.log(data)
      for (var _event of data) {
        calendar.addEvent(_event);
      }
    });
  })


  // Calendar Helper: Call API for Date Range
  function GetDoctorEventsByDateRange(startMonth, startDate, endMonth, endDate,
    _callback) {

    // Get Doctor Id
    var doctorId = $("#select-doctor").val();

    // Initialize response
    var myResponse = [];

    // First, get Open Timeslots
    $.ajax({
      type: "GET",
      url: UI_HELPER_API + "/open",
      data: {
        "doctorId" : doctorId,
        "startMonth" : startMonth,
        "startDate" : startDate,
        "endMonth" : endMonth,
        "endDate" : endDate
      },
      success: function (res1) {
        // Format and Append all Open Slots
        var counter = 0;
        for (var i=0; i<res1.length; i++) {
          for (var j=0; j<res1[i].length; j++) {
            var openSlot = {
              id : counter,
              title: res1[i][j].title,
              start: res1[i][j].startDate + "T" + res1[i][j].startTime,
              end: res1[i][j].endDate + "T" + res1[i][j].endTime,
              className: 'pp-calendar-open'
            };
            myResponse.push(openSlot);
            counter++;
          }
        }

        // Second, get Booked Timeslots
        $.ajax({
          type: "GET",
          url: UI_HELPER_API + "/booked",
          data: {
            "doctorId" : doctorId,
            "startMonth" : startMonth,
            "startDate" : startDate,
            "endMonth" : endMonth,
            "endDate" : endDate
          },
          success: function (res2) {
            // Format and Append all Booked Slots
            for (var i=0; i<res2.length; i++) {
              for (var j=0; j<res2[i].length; j++) {
                var bookedSlot = {
                  id : counter,
                  title: res2[i][j].title,
                  start: res2[i][j].startDate + "T" + res2[i][j].startTime,
                  end: res2[i][j].endDate + "T" + res2[i][j].endTime,
                  className: 'pp-calendar-booked',
                  extendedProps: {
                    isTeleVisit: res2[i][j].isTeleVisit,
                    patientId: res2[i][j].patientId,
                    doctorId: res2[i][j].doctorId
                  }
                };
                myResponse.push(bookedSlot);
                counter++;
              }
            }

            // TODO - Add another AJAX call for cancelled slots?
            //   {
            //     id: 5,
            //     title: 'Cancellation',
            //     start: '2020-11-06T16:30:00',
            //     end: '2020-11-06T17:30:00',
            //     className: 'pp-calendar-cancelled',
            //     extendedProps: {
            //       patientName: "Young, Angela",
            //       cancelledById: 101,
            //       cancelledByName: 'Young, Angela',
            //       appointmentType: "In-Person"
            //     }
            //   }

            console.log(myResponse);
            return _callback(myResponse);

          } // end success 2
        }); // end AJAX call 2
      } // end success 1
    }); // end AJAX call 1

  }

  // Calendar Helper: Call API to update Doctor Availablity
  function UpdateDoctorAvailability(startMonth, startDay, startHour, startMinute,
    endMonth, endDay, endHour, endMinute,
    _callback) {

    // Get Doctor Id
    var doctorId = $("#select-doctor").val();

    // TODO add an AJAX call here
    // GET params: doctorId, startMonth, startDay, startHour, startMinute, endMonth, endDay, endHour, endMinute
    return _callback(true, false);

  }

  // Calendar Helper: Call All events
  function ClearAllCalendarEvents(calendar) {
    var allEvents = calendar.getEvents();
    for (var _event of allEvents) {
      _event.remove();
    }
  }


  // Modal Helper: Cancelled Booked Appointment (by Practice)
  $("#bookedAptModal-cancel-apt").on('click', function(){

    // Get Data Elements
    var appointmentId = $("#bookedAptModal-label-apt-id").val();
    var cancelledById = 301; // TODO - Where to get logged-in person Id?

    //  TODO - AJAX Call

      // Remove Event
      var _event = calendar.getEventById(appointmentId);
      // Event Properties
      var startDateTime = _event.start;
      var endDateTime = _event.end;
      _event.remove();

      // Add Back Updated Event with updated Values
      var _updatedEvent = {
        id: appointmentId,
        title: 'Cancellation',
        start: startDateTime,
        end: endDateTime,
        className: 'pp-calendar-cancelled',
        extendedProps: {
          patientName: "Patient Name",
          cancelledById: cancelledById,
          cancelledByName: 'Receptionist Jane',
        }
      }
      calendar.addEvent(_updatedEvent);

      // Close Modal
      $("#bookedAptModal").modal('hide');

    return false;


  });


  // Modal Helper: Book New Appointment (by Practice)
  $("#openAptModal-book-apt").on('click', function() {

    // Get Data Elements
    var openId = $("#openAptModal-label-apt-id").val();
    var isTeleVisit = $("#openAptModal-label-apt-type").val();
    var doctorId = $("#select-doctor").val();
    var patientId = $("#openAptModal-label-patient-name").val();

    //  TODO - AJAX Call
    // .done(function(res, err){
    //
    // })

      // Remove Event
      var _event = calendar.getEventById(openId);
      // Event Properties
      var startDateTime = _event.start;
      var endDateTime = _event.end;
      _event.remove();

      // Add Back Updated Event with updated Values
      var _updatedEvent = {
        id: 11,
        title: 'Demo, Demi',
        start: startDateTime,
        end: endDateTime,
        className: 'pp-calendar-booked',
        extendedProps: {
          patientId: 401,
          doctorId: 420,
          appointmentType: "In-Person"
        }
      }
      calendar.addEvent(_updatedEvent);

      // Close Modal
      $("#openAptModal").modal('hide');

    return false;

  });


  // Modal Helper: Remove Open Time Slot (by Practice)
  $("#openAptModal-delete-apt").on('click', function() {
    // Get Data Elements
    var openId = $("#openAptModal-label-apt-id").val();
    var doctorId = $("#select-doctor").val();

    //  TODO - AJAX Call

      // Get Event Time Line
      var _event = calendar.getEventById(openId);
      var startDateTime = _event.start;
      var endDateTime = _event.end;
      _event.remove();

      // Close Modal
      $("#openAptModal").modal('hide');

    return false;

  });


  // Modal Helper: Start TeleVist Session
  $("#bookedAptModal-televisit").on('click', function() {

    // Get Appointment and Doctor
    var doctorId = $("#select-doctor").val();
    var appointmentId = $("#bookedAptModal-label-apt-id").val();

    // Redirect to TeleVisit
    var newURL = window.location.origin + "/televisit?appointmentId=" + appointmentId + "&doctorId="+doctorId;
    window.location.replace(newURL);

  });


  // Get start of calendar (Sunday of current week)
  function GetCurrentWeekSunday() {
    var d = new Date();
    var day = d.getDay(),
    diff = (d.getDate() - day + (day == 0 ? -6 : 1)) - 1; // adjust when day is sunday
    return new Date(d.setDate(diff));
  }




});
