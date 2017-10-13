var Calendar = new Date();
var year = Calendar.getFullYear();	    // Returns year
var month = Calendar.getMonth();    // Returns month (0-11)
var today = Calendar.getDate();    // Returns day (1-31)

function setDafaultDate(){
	document.getElementById("myDate").value = year + "-" + (month+1) + "-" + today;
}