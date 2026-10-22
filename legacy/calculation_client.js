// calculation_client.js
// // get a reference to the form and the calculate button
// const form = document.getElementById("dough-form");
// const calculateButton = document.getElementById("calculate-button");
//
// // add an event listener to the form
// form.addEventListener("submit", (event) => {
//         // prevent the default form submission behaviour
//         event.preventDefault();
//         // get the form values
//         const finalMass = form.elements["final_mass"].value;
//         const hydration = form.elements["hydration"].value;
//         const flour1Percent = form.elements["flour_1_percent"].value;
//         const flour2Percent = form.elements["flour_2_percent"].value;
//         const flour3Percent = form.elements["flour_3_percent"].value;
//         const saltPercent = form.elements["salt_percent"].value;
//         const starterPercent = form.elements["starter_percent"].value;
//         // send a request to the server to calculate the dough recipe
//         fetch("/calculate", {
//                 method: "POST",
//                 headers: {
//                         "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                         final_mass: finalMass,
//                         hydration: hydration,
//                         flour_1_percent: flour1Percent,
//                         flour_2_percent: flour2Percent,
//                         flour_3_percent: flour3Percent,
//                         salt_percent: saltPercent,
//                         starter_percent: starterPercent,
//                 }),
//         })
//                 .then((response) => response.json())
//                 .then((recipe) => {
//                         // get the recipe elements
//                         const flour1Mass = document.getElementById("flour_1_mass");
//                         const flour2Mass = document.getElementById("flour_2_mass");
//                         const flour3Mass = document.getElementById("flour_3_mass");
//                         const saltMass = document.getElementById("salt_mass");
//                         const starterMass = document.getElementById("starter_mass");
//                         const waterMass = document.getElementById("water_mass");
//                         // set the recipe elements
//                         flour1Mass.textContent = recipe.flour_1_mass;
//                         flour2Mass.textContent = recipe.flour_2_mass;
//                         flour3Mass.textContent = recipe.flour_3_mass;
//                         saltMass.textContent = recipe.salt_mass;
//                         starterMass.textContent = recipe.starter_mass;
//                         waterMass.textContent = recipe.water_mass;
//                 });
//
// });

// get a reference to the form and the calculate button
var calculateForm = document.getElementById('calculate-form');
var calculateButton = document.getElementById('calculate-button');

// add an event listener that listens for the 'submit' event on the form
calculateForm.addEventListener('submit', function(event) {
  // prevent the form from being submitted the traditional way
  event.preventDefault();

  // make an HTTP POST request to the /calculate route
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/calculate');
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.onload = function() {
    if (xhr.status === 200) {
      // if the request is successful, display the result
      document.getElementById('result').innerHTML = xhr.responseText;
    }
  };
  xhr.send(new FormData(calculateForm));
});