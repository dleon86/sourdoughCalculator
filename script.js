const calculateDoughRecipe = (finalMass = 750, hydration = 72, flour1Percent = 80,
                              flour2Percent = 20, /*flour3Percent = 0,*/ saltPercent = 2.5,
                              starterPercent = 16) => {


  // Calculate the mass of sourdough starter
  const starterMass = finalMass * starterPercent / 100

  // Calculate the total flour mass
  const flourMass = (finalMass - starterMass * (saltPercent / 100 + hydration / 100 + 1) / 2) / (saltPercent / 100 + hydration / 100 + 1)

  // Calculate the total water mass
  const waterMass = flourMass * hydration / 100 + starterMass * (hydration / 100 - 1) / 2

  // Calculate the mass of each flour type
  const flour1Mass = flourMass * flour1Percent / 100
  const flour2Mass = flourMass * flour2Percent / 100
  // const flour3Mass = flourMass * flour3Percent / 100

  // Calculate the total flour mass
  const flourTotal = flour1Mass + flour2Mass //+ flour3Mass

  // Calculate the mass of salt
  const saltMass = (flourTotal + starterMass / 2) * saltPercent / 100

  // Return the recipe
  return {
    dateTime: new Date().toLocaleString(),
    flour1Mass,
    flour2Mass,
    // flour3Mass,
    flourTotal,
    waterMass,
    saltMass,
    starterMass,
  }
}

document.querySelector("#calculate-recipe").addEventListener("click", () => {
  // const recipe = calculateDoughRecipe()
  const table = document.querySelector("#results tbody")
  const row = document.createElement("tr")

  // get the input values from the table to pass to the function
  const finalMass = document.getElementById("final-mass").value;
  const hydration = document.getElementById("hydration").value;
  const flour1Percent = document.getElementById("flour1-percent").value;
  const flour2Percent = document.getElementById("flour2-percent").value;
  // const flour3Percent = document.getElementById("flour3-percent").value;
  const saltPercent = document.getElementById("salt-percent").value;
  const starterPercent = document.getElementById("starter-percent").value;

  //     pass the input values to the function to calculate the recipe
  const recipe = calculateDoughRecipe(finalMass, hydration, flour1Percent, flour2Percent, /*flour3Percent,*/ saltPercent, starterPercent)


  row.innerHTML = `
      <td>${recipe.dateTime}</td>
      <td>${recipe.flour1Mass.toFixed(2)}</td>
      <td>${recipe.flour2Mass.toFixed(2)}</td>
      <td>${recipe.flourTotal.toFixed(2)}</td>
      <td>${recipe.waterMass.toFixed(2)}</td>
      <td>${recipe.saltMass.toFixed(2)}</td>
      <td>${recipe.starterMass.toFixed(2)}</td>
    `
  // table.appendChild(row)
  table.insertBefore(row, table.firstChild)


})

//    make a listener to press the calculate recipe button when the user presses enter
document.getElementById("final-mass").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});

document.getElementById("hydration").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});

document.getElementById("flour1-percent").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});

document.getElementById("flour2-percent").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});

/*document.getElementById("flour3-percent").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});*/

document.getElementById("salt-percent").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});

document.getElementById("starter-percent").addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    document.getElementById("calculate-recipe").click();
  }
});
