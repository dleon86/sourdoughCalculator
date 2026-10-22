const calculateDoughRecipe = (finalMass = 750, hydration = 72, flour1Percent = 80,
                              flour2Percent = 20, /*flour3Percent = 0,*/ saltPercent = 2.5,
                              starterPercent = 20) => {


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
    flour1Mass: flour1Mass,
    flour2Mass: flour2Mass,
    flourTotal: flourTotal,
    waterMass: waterMass,
    saltMass: saltMass,
    starterMass: starterMass,
    flourTypes: [
      { type: "Flour 1", percent: flour1Percent },
      { type: "Flour 2", percent: flour2Percent }
      // Add more flour types if needed
    ],
    flourMasses: [
      { type: "Flour 1", mass: flour1Mass },
      { type: "Flour 2", mass: flour2Mass }
      // Add more flour masses if needed
    ]
  };
}

document.querySelector("#calculate-recipe").addEventListener("click", () => {
  const table = document.querySelector("#results tbody");
  const row = document.createElement("tr");

  // Get the input values
  const finalMass = parseFloat(document.getElementById("final-mass").value);
  const hydration = parseFloat(document.getElementById("hydration").value);
  const flour1Percent = parseFloat(document.getElementById("flour1-percent").value);
  const flour2Percent = parseFloat(document.getElementById("flour2-percent").value);
  const saltPercent = parseFloat(document.getElementById("salt-percent").value);
  const starterPercent = parseFloat(document.getElementById("starter-percent").value);

  // Calculate the recipe
  const recipe = calculateDoughRecipe(finalMass, hydration, flour1Percent, flour2Percent, saltPercent, starterPercent);

  // Display in the table
  row.innerHTML = `
      <td>${recipe.dateTime}</td>
      <td>${recipe.flour1Mass.toFixed(2)}</td>
      <td>${recipe.flour2Mass.toFixed(2)}</td>
      <td>${recipe.flourTotal.toFixed(2)}</td>
      <td>${recipe.waterMass.toFixed(2)}</td>
      <td>${recipe.saltMass.toFixed(2)}</td>
      <td>${recipe.starterMass.toFixed(2)}</td>
      <td><button class="preview-btn" data-recipe='${JSON.stringify(recipe)}'>Preview</button></td>
      <td><button class="save-btn" data-recipe='${JSON.stringify(recipe)}'>Save</button></td>
    `;
  table.insertBefore(row, table.firstChild);

  // Add event listeners for preview and save buttons
  row.querySelector(".preview-btn").addEventListener("click", handlePreview);
  row.querySelector(".save-btn").addEventListener("click", handleSave);
});

const previewModal = document.getElementById("preview-modal");
const previewContent = document.getElementById("preview-content");
const closeBtn = document.querySelector(".close-btn");

const handlePreview = (event) => {
  const recipe = JSON.parse(event.target.getAttribute('data-recipe'));
  previewContent.textContent = JSON.stringify(recipe, null, 2);
  previewModal.style.display = "block";
}

closeBtn.onclick = () => {
  previewModal.style.display = "none";
}

window.onclick = (event) => {
  if (event.target == previewModal) {
    previewModal.style.display = "none";
  }
}

const handleSave = async (event) => {
  const recipe = JSON.parse(event.target.getAttribute('data-recipe'));
  try {
    const response = await fetch('http://localhost:5000/api/recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipe)
    });
    const result = await response.json();
    if (response.status === 201) {
      alert('Recipe saved successfully!');
    } else {
      alert('Error saving recipe: ' + result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while saving the recipe.');
  }
}

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
