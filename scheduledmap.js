
var map;
var infowindow = new google.maps.InfoWindow();
var contentstring;
var resultMarker;
var markers = [];
var colors = ['fd8d08', 'ffed5c', 'bce3ff', '6b98ff', '97ec7d', '01bf00', 'cb9d7c', 'c89bff', 'fe7569', 'fdabff'];
var searchedproperty;
var searchedpropertyid = null;
var isHidden = true;
var currentcrewid = 0;
var selectedmarker;
var selectedcrewid = null;
var selectedday = null;
var selectedsiteid = null;

$(document).ready(function () {

    $('.searchmap').focus();

    InitMap();

    setTimeout(MarkAsonsLocation, 250);

    // setTimeout(GetSchedule, 250);

    $('.leftpanel-toggle-button').click(function () {

        ToggleLeftPanel();

    });

    GetUnassigned();

    GetContractorHome();

    google.maps.event.addListener(infowindow, 'closeclick', function () {
        selectedmarker = null;
    });

});

function ToggleLeftPanel() {

    if (!isHidden) {

        $('.leftpanel').stop().animate({ left: '-330px' });

        $('.leftpanel-toggle-button-container').stop().animate({ left: '0px' });

        isHidden = true;
    }
    else {

        $('.leftpanel').stop().animate({ left: '10px' });

        $('.leftpanel-toggle-button-container').stop().animate({ left: '332px' });

        isHidden = false;

    }

}

function ShowLeftPanel() {

    $('.leftpanel').stop().animate({ left: '10px' });

    $('.leftpanel-toggle-button-container').stop().animate({ left: '332px' });

    isHidden = false;

}

function HideLeftPanel() {

    $('.leftpanel').stop().animate({ left: '-330px' });

    $('.leftpanel-toggle-button-container').stop().animate({ left: '0px' });

    isHidden = true;

}

function InitMap() {
    // US Center - 39.1654038, -96.1531815
    var center = { lat: 39.1654038, lng: -96.1531815 };

    map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 5,
        streetViewControl: false,
        scaleControl: true,
        scaleControlOptions: {
            position: google.maps.ControlPosition.BOTTOM_RIGHT
        },
        mayTypeId: 'roadmap',
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.BOTTOM_LEFT
        }
    });

    // Default scale to miles
    SetLegendScale();

    SetMapSize();

    $(window).resize(function () {

        SetLegendScale();

        SetMapSize();

    });
}

function SetLegendScale() {

    var scaleInterval = setInterval(function () {
        var scale = $(".gm-style-cc:not(.gmnoprint):contains(' km')");
        if (scale.length) {
            scale.click();
            clearInterval(scaleInterval);
        }
    }, 100);

}

function SetMapSize() {

    var windowHeight = $(window).height();
    var windowWidth = $(window).width();

    $('.map').width(windowWidth).height(windowHeight);

    SetLeftPanelSize(windowHeight);

}

function SetLeftPanelSize(mapHeight) {

    if (mapHeight > 300) {
        $('.leftpanel').height((mapHeight - 280));
        $('.contractors').height((mapHeight - 310));
    }

}

function MarkAsonsLocation() {
    // ASONS HQ - 40.1654038, -85.4231815
    var asons = { lat: 40.1654038, lng: -85.4231815 };

    var marker = new google.maps.Marker({
        position: asons,
        map: map,
        title: 'ASONS'
    });

}

var label = null;

function GetSchedule() {

    var count = 0;
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    $.ajax({
        type: 'GET',
        url: webapiaddress + 'map/schedule/inbounds/?north=' + ne.lng() + '&east=' + ne.lat() + '&south=' + sw.lat() + '&west=' + sw.lng(),
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            $.map(data, function (item) {

                if (item.DriveTime == null) {

                    var appointmentDate = GetFormattedDateTime(new Date(item.EarliestArrival));
                    label = item.DaysOff;

                    var m = CreateMarker(item.Latitude, item.Longitude, item.MarkerColor, appointmentDate);
                
                    // Create info window
                    //    
                    m.addListener('click', function () {

                        selectedmarker = m;

                        var content = GetContentString(item.ClientName, item.FullAddress, item.CrewName, appointmentDate, item.PropertyCoordinator);

                        infowindow.setContent(content);
                        infowindow.open(map, m);

                        GetDistance(item.Latitude, item.Longitude);

                        var d = item.DaysOff;

                        selectedday = d;
                        selectedcrewid = item.CrewId;
                        selectedsiteid = item.SiteId;

                        PropertySelected(item.CrewId, d);

                        ShowLeftPanel();

                        SelectAppointment(item.SiteId);
                    });
                }
            });

        },
        failure: function (response) {
            alert(response);
        }
    });

}

function GetContentString(client, address, tech, appointment, pc) {

    var contentstring;
    
    contentstring = '<div class="markerinfo">' +
                    '<div class="client">' + client + '</div>' +
                    '<div class="address">' + address + '</div>' +
                    '<div class="client">' + tech + '</div>' +
                    '<div class="address">' + appointment + '</div>' +
                    '<div class=address>' + pc + '</div>' +
                    '<div class="address duration"></div>' +
                    '</div>';

    return contentstring;

}

function GetDistance(lat, long) {

    var duration = '';
    var origin = searchedproperty;
    var destination = lat + ', ' + long;

    var dirService = new google.maps.DirectionsService();
    var request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.DirectionsTravelMode.DRIVING
    }

    dirService.route(request, function (response, status) {

        if (status === 'OK') {

            var point = response.routes[0].legs[0];
            duration = point.duration.text;
            $('.duration').text(duration)
        }

    });

}

function ProcessResults(count) {

    for (var i = 0; i <= (count - 1) ; i++) {

        AddPropertyMarker(i);

    }
}

function AddPropertyMarker(i) {

    $.ajax({
        type: 'GET',
        // url: 'ScheduledMap.aspx/GetProperty',
        url: webapiaddress + 'map/schedule/property/' + i,
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            var latitude = parseFloat(data.Latitude);
            var longitude = parseFloat(data.Longitude);
            var appointmentDate = GetFormattedDateTime(new Date(data.EarliestArrival.substr(6)));

            CreateMarker(latitude, longitude, 'fe7569', appointmentDate);

        },
        failure: function (response) {
            alert(response.responseText);
        }
    });

}

function FocusOnProperty(siteid) {

    HideLeftPanel();

    selectedmarker = null;

    $.ajax({
        type: 'GET',
        url: webapiaddress + 'api/properties/' + siteid,
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            var latitude = parseFloat(data.Latitude);
            var longitude = parseFloat(data.Longitude);

            searchedproperty = new google.maps.LatLng(latitude, longitude);
            searchedpropertyid = siteid;

            if (resultMarker) {
                resultMarker.setMap(null);
                ClearMarkers();
            }

            var u = '';

            if (data.IsUnassigned)
                u = 'u';

            resultMarker = CreateMarkerWithFocus(latitude, longitude, 'fe7569', u, 300);
            resultMarker.setMap(map);

            GetSchedule();

            BuildLegend();

            PopulateLeftPanel(siteid);

            map.addListener('idle', RefreshMap);
        }
    });

}

function RefreshMap() {

    if (resultMarker) {
        ClearMarkers();
        resultMarker.setMap(map);
    }

    GetSchedule();

    BuildLegend();

    if (selectedmarker)
        google.maps.event.trigger(selectedmarker, 'click');

}

function CreateMarkerWithFocus(latitude, longitude, icon, title, zindex) {

    var point = { lat: latitude, lng: longitude };

    if (title === 'u') {
        label = 'U';
    }
    else {
        label = null;
    }
    
    var m = CreateMarker(latitude, longitude, icon, '', zindex);

    if (title === 'u') {

        var details = '';

        $.ajax({
            type: 'GET',
            url: webapiaddress + 'workorders/unassigned/' + searchedpropertyid,
            contentType: 'application/json; charset-utf-8',
            dataType: 'json',
            crossDomain: true,
            success: function (item) {

                m.addListener('click', function () {

                    var duedate = GetFormattedDateTime(new Date(item.LatestDeparture));

                    var details = '<div class="markerinfo">' +
                            '<div class="client">' + item.ClientName + '</div>' +
                            '<div class="address">' + item.Address + '</div>' +
                            '<div class="address">' + item.WorkCategory + ' - ' + item.WorkRequired + '</div>' +
                            '<div class="address">' + item.PropertyCoordinator + '</div>' +
                            '<div class="address">' + duedate + '</div>' +
                            '<div class="address duration"></div>' +
                            '</div>';

                    infowindow.setContent(details);
                    infowindow.open(map, m);

                });


            },
            failure: function (response) {
                alert(response);
            }
        });

    }

    map.panTo(point);

    map.setZoom(10);

    return m;

}

function CreateMarker(latitude, longitude, icon, title) {

    var point = { lat: latitude, lng: longitude };

    return PlaceMarker(point, icon, title);

}

function CreateMarker(latitude, longitude, icon, title, zindex) {

    var point = { lat: latitude, lng: longitude };

    return PlaceMarker(point, icon, title, zindex);

}

function PlaceMarker(point, iconpath, title) {

    return PlaceMarker(point, iconpath, title, 200);
    
}

function PlaceMarker(point, iconpath, title, zindex) {

    var url;

    if (label != null) {
        url = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + label + "|" + iconpath;
    }
    else {
        url = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=|" + iconpath;
    }

    var pinImage = new google.maps.MarkerImage(url,
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34));

    var marker = new google.maps.Marker({
        position: point,
        map: map,
        icon: pinImage,
        title: title,
        zIndex: zindex
    });

    markers.push(marker);

    return marker;

}

var contractordetails = '';

function BuildLegend() {

    var content = "";
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    $('.legend').html();

    content += '<img src="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=U|00fffc" /> ' + 'Unassigned';

    $.ajax({
        type: 'GET',
        // url: 'ScheduledMap.aspx/GetContractorsForLegend',
        url: webapiaddress + 'map/schedule/legend/?north=' + ne.lng() + '&east=' + ne.lat() + '&south=' + sw.lat() + '&west=' + sw.lng(),
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            $.map(data, function (item) {

                if (item.CrewName)
                    content += '<img src="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=|' + item.MarkerColor + '" /> ' + item.CrewName;

            });

            $('.legend').html(content);
        },
        failure: function (response) {
            alert(response);
        }
    });

}

function ClearMarkers() {

    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }

}

function PopulateLeftPanel(siteid) {

    var count = 0;
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    var content = '';

    $('.dayselect').html('');
    
    // Populate the days dropdown
    //
    for (var ds = 0; ds <= 6; ds++) {

        var cd = new Date();
        cd.setDate(cd.getDate() + ds);

        var nd = new Date(cd.getFullYear(), cd.getMonth(), cd.getDate(), 12, 0, 0, 0);

        var option = $('<option>').attr('value', (ds + 1)).text('(' + ds + ') ' + GetFormattedDate(nd));

        $('.dayselect').append($(option));

    }

    $('.dayselect').change(function () {
        $('.day').hide();
        $('.day' + $('.dayselect').val()).show();
    });

    $('.contractors').html('');
    $('.leftpanel').append($('.contractors'));

    $.ajax({
        type: 'GET',
        url: webapiaddress + 'map/schedule/leftpanel/?siteid=' + siteid + '&north=' + ne.lng() + '&east=' + ne.lat() + '&south=' + sw.lat() + '&west=' + sw.lng(),
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            ProcessPanelData(data);
            
        }

    });

}

function ProcessPanelData(data) {

    BuildLeftPanel(data);

    BuildBottomPanel(data);

}

function BuildLeftPanel(data) {

    var firstCrewId = null;

    $.map(data, function (item) {

        if (!firstCrewId)
            firstCrewId = item.CrewId;

        var contractor = $('<div>').addClass('contractor');
        $('.contractors').append($(contractor));

        var crewname = $('<div>').text(item.Name).addClass('contractorname').attr('id', item.CrewId);
        $(contractor).append($(crewname));

        var days = $('<div>').addClass('days ' + item.CrewId);
        $(contractor).append(days);

        if (item.ScheduledDays) {

            $.map(item.ScheduledDays, function (sd) {

                var d = $('<div>').addClass('day').addClass('day' + sd.DayNumber);
                $(days).append($(d));

                if (sd.Appointments) {

                    var prevaddress = '';
                    var ordertable = '';

                    $.map(sd.Appointments, function (appt) {

                        if (appt.DriveTime) {

                            var dt = $('<div>').addClass('drivetime');

                            var time = $('<label>').text('Travel Time: ' + appt.DriveTime);
                            $(dt).append($(time));

                            $(d).append($(dt));

                        }
                        else {

                            var datestart = new Date(appt.Start);
                            var dateend = new Date(appt.End);
                            var hac = 'appointment';
                            var appointment = $('<div>').addClass(hac);

                            $(appointment).attr('id', appt.SiteId);

                            var h = GetAppointmentHeight(datestart, dateend);

                            if (h < 30)
                                h = 30;

                            $(appointment).css('height', h + 'px');

                            var time = $('<label>').addClass('appointmenttime').text(GetFormattedTime(datestart) + ' - ' + GetFormattedTime(dateend));
                            var address = $('<label>').addClass('appointmentaddress').text(appt.Address);

                            $(appointment).append($(time)).append($(address));

                            var ordertable = $('<table width="100%">');
                            // var header = '<tr><td>Cat.</td><td>Req.</td><td>Dur.</td></tr>';
                            // $(ordertable).append($(header));

                            $.map(appt.Orders, function (o) {

                                var row = $('<tr>');

                                var category = $('<td>').text(o.WorkCategory);
                                var required = $('<td>').text(o.WorkRequired);
                                var duration = $('<td>').text(o.Duration);

                                $(row).append($(category)).append($(required)).append($(duration));

                                $(ordertable).append($(row));

                                h += 30;

                            });

                            $(appointment).css('height', h + 'px');

                            $(appointment).append($(ordertable));

                            $(d).append($(appointment));

                        }
                    }); // End Appointment

                }

            });

        }

    });

    // Select Tech and Selected Day
    //
    if (selectedday && selectedcrewid && selectedsiteid) {

        PropertySelected(selectedcrewid, selectedday);

        SelectAppointment(selectedsiteid);
    }
    else {
        $('.day').hide();
        $('.day' + $('.dayselect').val()).show();

        $('.days').hide();
        $('.' + firstCrewId).show();

        $('.contractorname').click(function () {
            $('.days').not($('.' + $(this).attr('id'))).hide(300);
            $('.' + $(this).attr('id')).toggle(300);
        });
    }

}

function BuildBottomPanel(data) {

    $.map(data, function (item) {



    });

}

function GetAppointmentHeight(datestart, dateend) {

    var diffMs = (dateend - datestart); // milliseconds
    var diffMins = diffMs / 60000; // minutes

    return diffMins;

}

function PropertySelected(crewid, day) {

    if (currentcrewid != crewid) {

        // Display the Tech's Schedule
        $('.days').not($('.' + $(this).attr('id'))).hide(300);
        $('.' + crewid).toggle(300);

        currentcrewid = crewid;
    }
    
    // Select the correct day
    $('.dayselect').val((day + 1));

    $('.day').hide();
    $('.day' + $('.dayselect').val()).show();
}

function SelectAppointment(siteid) {

    $('.appointment').removeClass('selected');

    $('#' + siteid).addClass('selected');

    if ($('.appointment.selected')) {
        if ($('.appointment.selected').offset()) {
            $('.contractors').scrollTop($('.appointment.selected').offset().top);
        }
    }
}

function GetFormattedDateTime(date) {

    var d = (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear() + " " +
        date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2);

    return d;

}

function GetFormattedDate(date) {

    var d = (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear();

    return d;

}

function GetFormattedTime(date) {

    var time = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = ' AM';

    if (hours > 12) {
        hours -= 12;
        ampm = ' PM';
    }
    else if (hours == 12) {
        ampm = ' PM';
    }
    else if (hours === 0) {
        hours = 12;
    } 

    return hours + ':' + ('0' + minutes).slice(-2) + ampm;;

}

function GetUnassigned() {

    $.ajax({
        type: 'GET',
        url: webapiaddress + 'workorders/unassigned',
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            $.map(data, function (item) {

                // make markers for the map

                if (item.Latitude && item.Longitude) {

                    var markercolor = '00fffc';

                    if (searchedpropertyid) {
                        alert('foo');
                        if (item.siteid == searchedpropertyid) {
                            alert('bar');
                            markercolor = 'fe7569';
                        }
                    }

                    var url = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=U|' + markercolor;
                    var point = { lat: item.Latitude, lng: item.Longitude };

                    var pinImage = new google.maps.MarkerImage(url,
                        new google.maps.Size(21, 34),
                        new google.maps.Point(0, 0),
                        new google.maps.Point(10, 34));

                    var marker = new google.maps.Marker({
                        position: point,
                        map: map,
                        icon: pinImage,
                        zIndex: 200
                    });

                    marker.addListener('click', function () {

                        selectedmarker = null;

                        var details = '';

                        var duedate = GetFormattedDateTime(new Date(item.LatestDeparture));

                        details = '<div class="markerinfo">' +
                            '<div class="client">' + item.ClientName + '</div>' +
                            '<div class="address">' + item.Address + '</div>' +
                            '<div class="address">' + item.WorkCategory + ' - ' + item.WorkRequired + '</div>' +
                            '<div class="address">' + item.PropertyCoordinator + '</div>' +
                            '<div class="address">' + duedate + '</div>' +
                            '<div class="address duration"></div>' +
                            '</div>';

                        infowindow.setContent(details);
                        infowindow.open(map, marker);

                    });

                }

            });

        }
    });

    $('.legend').html('<img src="http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=U|00fffc" /> ' + 'Unassigned');

}

function GetContractorHome() {

    // Display the home location for the contractor
    //

    $.ajax({
        type: 'GET',
        url: webapiaddress + 'map/schedule/contractors',
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            $.map(data, function (item) {

                if (item.CrewLatitude && item.CrewLongitude) {

                    var url = 'http://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=home|' + item.MarkerColor;
                    var point = { lat: item.CrewLatitude, lng: item.CrewLongitude };

                    var pinImage = new google.maps.MarkerImage(url,
                        new google.maps.Size(21, 34),
                        new google.maps.Point(0, 0),
                        new google.maps.Point(10, 34));

                    var marker = new google.maps.Marker({
                        position: point,
                        map: map,
                        icon: pinImage,
                        title: item.CrewName
                    });

                    marker.addListener('click', function () {

                        selectedmarker = null;

                        $.ajax({
                            type: 'GET',
                            // url: 'ScheduledMap.aspx/GetContractorsForLegend',
                            url: webapiaddress + 'contractor/' + item.CrewId,
                            contentType: 'application/json; charset-utf-8',
                            dataType: 'json',
                            crossDomain: true,
                            success: function (data) {

                                contractordetails = '';

                                contractordetails += '<div class="contractordetails">';
                                contractordetails += '<div class="contractordetailsname">' + data.Name + '</div>';
                                contractordetails += '<div>' + data.FullPayAddress + '</div>';

                                if (data.Phone) contractordetails += '<div><label>Phone: </label>' + data.Phone + '</div>';
                                if (data.Cell1) contractordetails += '<div><label>Cell: </label>' + data.Cell1 + '</div>';
                                if (data.Cell2) contractordetails += '<div><label>Cell: </label>' + data.Cell2 + '</div>';
                                if (data.Email1) contractordetails += '<div><label>Email: </label>' + data.Email1 + '</div>';
                                if (data.Email2) contractordetails += '<div><label>Email: </label>' + data.Email2 + '</div>';

                                contractordetails += '</div>';

                                infowindow.setContent(contractordetails);
                                infowindow.open(map, marker);

                            }
                        });

                    });

                }

            });

        }
    });

}

function DisplayTechSchedule() {

    var prevend = 0;
    var prevtravel = 0;
    var prevapptlen = 0;
    var min15 = 17;

    // Display the tenant windows with the schedules inside
    //
    $.ajax({
        type: 'GET',
        url: webapiaddress + 'map/schedule/appointments',
        contentType: 'application/json; charset-utf-8',
        dataType: 'json',
        crossDomain: true,
        success: function (data) {

            $.map(data, function (item) {

                var property = $('<div>').addClass('property');

                var address = $('<div>').addclas('address spacer').text(item.Address);
                var hours = $('<div>').addClass('hours');
                var appt = $('<div>').addClass('appointment');

                // calculate width based on duration minutes
                //
                var hourwidth = 136
                $(hours).css({
                    width: hourwidth + ' px',
                    left: (prevend - 4) + ' px'
                });
                
                var apptwidth = 17;
                $(appt).css({
                    width: apptwidth + ' px',
                    left: '0 px'
                });

            });

        }
    });

}





