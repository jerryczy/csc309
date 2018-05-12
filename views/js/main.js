/*jshint esversion: 6 */ 
var maps_key = 'AIzaSyAE89qOXN2ietR3E7h9J8FjxOKiiJNqbqw';
var places_key = 'AIzaSyAJkRDSA2pFqXaCWYHrHTl8bWxubJiFEKc';
var map_javascript_key = 'AIzaSyA-CSStQZ-EtiP6urWuQUm2FlWoUTQPtGA';
var fbi_key = 'iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv';
var icon_flag = true;
var map;
var usersession;
var userpass;
console.log("Loaded");
var login_status = false;
var school;
// Gets the address users searched
// When they clicked submit button
$(document).ready(function(){
    console.log("Ready");
    // openTab(event, "Login");
    document.getElementById('Login').style.display = "block"; 
    login_status = JSON.parse(sessionStorage.getItem("login_status"));
    checkLogIn();
    if (login_status == true){
        $('#logout').css("display","");
         $('#login').css("display","none");
    }
    else{
        $('#logout').css("display","none");
         $('#login').css("display","");
    }
    $('#uniSubmit').click(function(){
        console.log("button was clicked");
        getAddress($('#uniName').val());
    });
    $('#signup').click(function(){
        console.log("Signing up");
        signUp($('#signName').val(), $('#signPassword').val());
    });
    $('#logout').click(logout);

    $('#login').click(function(){
        console.log("Logging in");
        logIn($('#userName').val(), $('#password').val());
    });

    $('#addFav').click(addFavourite);
		
    $('#uniHeader').click(showFavouriteUnis);

	$(document).on('click','.deleteBut',function() {
        deleteFavourite($(this).next().text(), $(this).next().next().text());
        $(this).closest("div").remove();
    });
});


// Given a string of the university name
// Find address and lat/long coordinates
// Slide open basicAddress showing the address
function getAddress(uniName){
    let addressUrl = "https://maps.googleapis.com/maps/api/geocode/json?address="+uniName.replace(/\ /g,'+')+"&key=" + maps_key;
    // Hide the div so we can slide it open
    // And empty it so the user can use it multiple times
    $.ajax({
        type:"GET",
        url:addressUrl,
        dataType : 'json',
        success: function(data){
            try {
                var address = data.results[0].formatted_address;
                var location = data.results[0].geometry.location;
                var address_comp = data.results[0].address_components;
                var state = get_component(address_comp, "administrative_area_level_1");
                var country = get_component(address_comp, "country");
                var city = get_component(address_comp,'locality');
                console.log("City:" + city);
                console.log("Get Address: " + address); 
                $("#basicAdd").slideDown(800);
                $("#basicAddress").hide();
                $("#basicBar").hide();
                $("#basicAddress").empty();
                $('#basicAddress').
                append($('<h4>').text(address)).
                slideDown(800);
                checkLogIn();
                if (login_status == true) {
                    $("#basicBar").slideDown(800);
                    document.getElementById("addFav").style.display = "";
                }
                map = new google.maps.Map(document.getElementById('map'), {
                    center: location,
                    zoom: 15
                });
                $('#infoRow').css("display","");
                crime(country, state);
                restaurant_search(location);
                lib_search(location);
                qualityOfLife(city); 
                specificUniName(location);
            } catch (TypeError) {
                alert("invalid university name!");
            }
        },
        error: function(xhr, status, error){
            console.log(eval('('+xhr.responseText+')'));
            alert("invalid university name!");
        }
    });
}


function specificUniName(location) {
    var request = {
        location: location,
        radius: '500',
        type: ['university']
    };
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callbackU);
}


function callbackU(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        //get the closest university near the location
       school = results[0].name;
    } else {
        //If there's no universities near the location, just put what user input
        school = $('#uniName').val();
    }
}


// reference: https://developers.google.com/maps/documentation/javascript/
// Given a string of location
// Search restaurants within 1km area
function restaurant_search(location) {
    $("#restaurants").hide();
    $("#restaurants").empty();
    var transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(map);
    var request = {
        location: location,
        radius: '1000',
        types: ['restaurant' ]
    };
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);
}


// resraurant search call back
function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        $("#restaurants").
        append($('<h4>').text("Some Restaurants Around:\n")).
        slideDown(800);
        results = results.sort(function(a, b) {
            if (!$.isNumeric(a.rating)) {
                return 1;
            } else if (!$.isNumeric(b.rating)) {
                return -1;
            }
            return b.rating - a.rating;
        });
        console.log("Get top ten restaurants by rating");
        for (var i = 0; i < 10 && i < results.length; i++) {
            createMarker(results[i], map, i+1);
            var rate = "rate: " + results[i].rating;
            // remove the city name from address
            var address = "address: " + results[i].vicinity.split(/, /).slice(0,-1).join(', ');
            $('#restaurants').
            append($('<li>').text(results[i].name)).
            append($('<ul>').
                append($('<li>').text(rate)).css({"list-style-type": "circle"}).
                append($('<li>').text(address)).css({"list-style-type": "circle"})).
            slideDown(800);
        }
    } else {
        console.log("error: " + status);
    }
}


// Given a string of location
// Search libraries within 500m area
function lib_search(location) {
    $("#libraries").empty();
    var request_L = {
        location: location,
        radius: '500',
        type: ['library']
    };
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request_L, callback_L);
}


// Library search callback
function callback_L(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        $("#libraries").
        append($('<h4>').text("Some Libraries Around(total: " + results.length + "):\n")).
        slideDown(800);
        results = results.sort(function(a, b) {
            if (!$.isNumeric(a.rating)) {
                return 1;
            } else if (!$.isNumeric(b.rating)) {
                return -1;
            }
            return b.rating - a.rating;
        });
        icon_flag = false;
        console.log("Get top ten libraries by rating");
        for (var i = 0; i < results.length; i++) {
            createMarker(results[i], map, i+1);
            if (i >= 10) {
                continue;
            }
            var rate;
            if ($.isNumeric(results[i].rating)) {
                rate = "rate: " + results[i].rating;
            } else {
                rate = "rate: no user reviews.";
            }
            var address = "address: " + results[i].vicinity.split(/, /).slice(0,-1).join(', ');
            $('#libraries').
            append($('<li>').text(results[i].name)).
            append($('<ul>').
                append($('<li>').text(rate)).css({"list-style-type": "circle"}).
                append($('<li>').text(address)).css({"list-style-type": "circle"})).
            slideDown(800);
        }
        icon_flag = true;
    } else {
        console.log("error: " + status);
    }
}


// create marker on the map
function createMarker(place, map, index) {
    var marker;
    if(icon_flag){
        // original marker icon with number
        marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
            label: index.toString()
        });
    } else {
        // blue icon for libraries
        marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
            icon: "http://labs.google.com/ridefinder/images/mm_20_blue.png"
        });
    }
    var infowindow = new google.maps.InfoWindow({content: ''});
    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(place.name);
        infowindow.open(map, this);
    });
}


//opening tab for search, login, about page
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
    checkLogIn();
    if (login_status == false){
        $('#uniRow').css("display","none");
    }
    if (login_status == true){
        $('#uniRow').css("display","");
    }
}


// return the sepecific component(city/state/country abberivation) of an given address
function get_component(add, target) {
    for (i = 0; i < add.length; i++) {
        if (add[i].types[0] == target) {
            return add[i].short_name;
        }
    }
    return '';
}


// use api to find crime counts for US
function crime(country, state) {
    console.log(country + ' ' + state);
    $("#info").empty();
    let hate_crime = 'https://api.usa.gov/crime/fbi/ucr/hc/count/states/' + state + 
    '/bias_name?page=1&per_page=100&output=json&api_key=' + fbi_key;
    let participation = 'https://api.usa.gov/crime/fbi/ucr/participation/states/' + state + 
    '?page=1&per_page=10&output=json&api_key=' + fbi_key;

    if (country != 'US') {
        console.log('Unsupport region for crime data.');
        $("#info").
            append($('<h4>').text("State level crime rate information(data based on FBI Crime Data)")).
            append($('<p>').text("Unsupported region for crime data."));
    } else if (state == '') {
        console.log('invalid address, no abberivation of state found.');
    } else {
        // get population
        $.ajax({
            type:"GET",
            url:participation,
            dataType : 'json',
            success: function(data){
                var population = data.results[1].total_population;
                // we only consider crime rate in 2015
                console.log("population: " + population);
                $.ajax({
                    type:"GET",
                    url:hate_crime,
                    dataType : 'json',
                    success: function(data){
                        var crime_count = 0;
                        var results = data.results;
                        for (i = 0; i < results.length; i++) {
                            if (results[i].year == 2015 && $.isNumeric(results[i].count)) {
                                crime_count += results[i].count;
                            }
                        }
                        crime_rate = parseFloat(crime_count / population * 100000).toPrecision(5);
                        let color = 'red';
                        if (crime_rate < 2.5){
                          color = 'yellow';
                        }
                        if (crime_rate < 1.25){
                          color = 'green';
                        }
                        $("#info").
                        append($('<h4>').text("State level crime rate information(data based on FBI Crime Data)")).
                        append($('<li>').text("total population: " + population)).
                        append($('<li>').text("crime rate over 100,000: ").append($('<p>').text(crime_rate).css({'color':color,'display':'inline'})));
                    },
                    error: function(xhr, status, error){
                        console.log(eval('('+xhr.responseText+')'));
                    }
                });
            },
            error: function(xhr, status, error){
                console.log(eval('('+xhr.responseText+')'));
            }
        });
    }   
}


// Gets the quality of living by city and appends it to the quality list
function qualityOfLife(city){
    $('#quality').hide();
    $('#quality').empty();
    $('#qualityBar').empty();
    $('#qualityheader').slideDown(400);
    $.ajax({
        type:"GET",
        url:'https://api.teleport.org/api/urban_areas/slug:' + city.replace(/\ /g,'-').toLowerCase()+'/scores/',
        dataType: 'json',
        success: function(data){
            try{

                $.each(data.categories, function(i, item){
                    // $('<li>')
                    //   .text(item.name + ': ' +item['score_out_of_10'])
                    //   .appendTo('#quality');
                    $('#qualityBar')
                        .append($('<p>').addClass('barName').text(item.name))
                        .append($('<div>').addClass('bar').addClass('').css({
                            backgroundColor : getRandomColor(),
                            width : (item['score_out_of_10']*10).toString() + '%'
                            })
                            .append($('<div>').text(item['score_out_of_10'].toPrecision(3)))
                        );
                });
                $('#quality').slideDown(400);
            } catch (TypeError){
				console.log("TypeError in quality of life"); // for debug
            }
        },
        error: function(xhr, status, error){
            $('<li>')
                .text("City Not Supported")
                .appendTo('#quality'); 
            $('#quality').slideDown(400);
        }
    });
}


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function signUp(signName, signPassword){
  $.ajax({
    type:"POST",
    url:'http://localhost:3000/signup',
    data: {
        username: signName,
        password: signPassword
    },
    success: function(data){
      $('#signMessage').empty().text("Successfully Signed Up!").css('color','green');
    },
    error: function(xhr, status, error){
		// Add proper error messages
		$('#signMessage').empty().text(xhr.responseText).css('color','red');
    }
    });
}


function logIn(logName, passwd) {
    $.ajax({
        type:"POST",
        url: 'http://localhost:3000/login',
        data: { username: logName, password: passwd},
        success: function(data){
            $('#loginMessage').empty().text("Login Successful!").css('color', 'green');
            login_status = true;
            $('#logout').css("display","");
            $('#login').css("display","none");

        $('#userName').val("");
        $('#password').val("");
          sessionStorage.setItem("login_status", JSON.stringify(login_status));
        },
        error: function(xhr, status, error){
            $('#loginMessage').empty().text(xhr.responseText).css('color', 'red');
        }
    });
}


// Attached to the button "Add Favourites" which only appears when
// logged in. 
function addFavourite(){
    console.log("adding favourite");
    var address = $('#basicAddress').text();
    //var uniName = $('#uniName').val();
    var uniName = school;
    $.ajax({
        type:"PUT",
        url: 'http://localhost:3000/favourite',
        data: {name:uniName,fav:address},
        success: function(data){
            console.log("successfully added favourite");
            console.log(data);
			alert("University successfully added!");
			if ($('#savedUnis').is(":visible")){
				var $newDiv = $("<div/>").html("<button class='deleteBut'> X </button>");
				$('<h5>').text(uniName + "  (click to see on the map)").appendTo($newDiv).click(function(){
				// When clicked, enter that university and enter
				    $('#uniName').val(uniName);
					$('#uniSubmit').click();
					// Scroll down
					$('html, body').animate({
						scrollTop: $('#basicAdd').offset().top
					}, 'slow');
				});

				$('<p>').text(address).appendTo($newDiv);
				$('<hr>').appendTo($newDiv);
				($newDiv).appendTo($('#savedUnis'));
			}
		},
		error: function(xhr, status, error){
			alert("University already saved");
			console.log(xhr.responseText);
		}
	});
}


// Attached to the See Favourite Universities
// Displays a list of universities
function showFavouriteUnis() {
    console.log("SHOW ME");
	if ($('#savedUnis').is(":visible")) {
		$('#savedUnis').slideUp(600);
		$('#savedUnis').empty();
	}
	else{
		$.ajax({
			type:"GET",
			url: 'http://localhost:3000/favourite',
			success: function(data) {
				console.log(data);
				$('#savedUnis').hide();
				$('#savedUnis').empty();
				$.each(data, function(index, value){
	      		var $newDiv = $("<div/>").html("<button class='deleteBut'> X </button>");
					$('<h5>').text(value[0] + "  (click to see on the map)").appendTo($newDiv).click(function() {
						// When clicked, enter that university and enter
						$('#uniName').val(value[0]);
						$('#uniSubmit').click();
						// Scroll down
						$('html, body').animate({
							scrollTop: $('#basicAdd').offset().top
						}, 'slow');
					});
					$('<p>').text(value[1]).appendTo($newDiv);
					$('<hr>').appendTo($newDiv);
					($newDiv).appendTo($('#savedUnis'));
				});
				$('#savedUnis').slideDown(600);
			},
			error: function(xhr, status, error){
				console.log(xhr.responseText);
			}
		});
	}
}


function deleteFavourite(uniName, uniAddress){
	$.ajax({
		type:"DELETE",
		url: 'http://localhost:3000/favourite',
		data: {name: uniName, fav:uniAddress},
		success: function(data) {
			console.log("successfully deleted favourite");
			alert("Selected University successfully deleted!");
		},
		error: function(xhr, status, error) {
			console.log(xhr.responseText);
		}
	});
}


function logout(){
	$.ajax({
        type:"GET",
        url:"http://localhost:3000/logout",
        success: function(data){
            $('#savedUnis').empty();
            $('#basicBar').hide();
            $('#loginMessage').empty().text("Logout Successful!").css('color', 'green');
            login_status = false;
            $('#logout').css("display","none");
            $('#login').css("display","");
            sessionStorage.setItem("login_status", JSON.stringify(login_status));
        },
        error: function(xhr, status, error){
            $('#loginMessage').empty().text(xhr.responseText).css('color', 'red');
        }
    });
}


function checkLogIn() {
    $.ajax({
        type:"GET",
        url:"http://localhost:3000/checkLogIn",
        success: function(){
            login_status = true;
            $('#logout').css("display","");
            $('#login').css("display","none");
        },
        error: function(){
            login_status = false;
            $('#logout').css("display","none");
            $('#login').css("display","");
        }
    });
}
