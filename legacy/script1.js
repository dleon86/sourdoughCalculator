
document.addEventListener('DOMContentLoaded', () => {
    const addFlourBtn = document.getElementById('add-flour');
    const calculateBtn = document.getElementById('calculate-recipe');
    const clearResultsBtn = document.getElementById('clear-results');
    const exportCsvBtn = document.getElementById('export-csv');
    const flourContainer = document.getElementById('flour-types-container');
    const resultsTableBody = document.getElementById('results-table').querySelector('tbody');

    let flourInputs = [];

    addFlourBtn.addEventListener('click', addFlourType);
    calculateBtn.addEventListener('click', calculateDoughRecipe);
    clearResultsBtn.addEventListener('click', clearResults);
    exportCsvBtn.addEventListener('click', exportToCSV);

    function addFlourType() {
        const flourCount = flourContainer.children.length + 1;
        const flourDiv = document.createElement('div');
        flourDiv.className = 'flour-type';
        flourDiv.innerHTML = `
            <label>Flour ${flourCount} (%): </label>
            <input type="number" class="flour-percent" value="0">
        `;
        flourContainer.appendChild(flourDiv);

        updateFlourInputs();
    }

    function updateFlourInputs() {
        flourInputs = Array.from(document.querySelectorAll('.flour-percent'));
        flourInputs.forEach(input => input.addEventListener('input', adjustFlourPercentages));
    }

    function calculateTotalFlourPercentage() {
        return flourInputs.reduce((total, input) => total + parseFloat(input.value || 0), 0);
    }

    function adjustFlourPercentages(changedInput) {
        const totalPercentage = calculateTotalFlourPercentage();
        if (totalPercentage !== 100) {
            const remainingPercentage = 100 - totalPercentage;
            flourInputs.forEach(input => {
                if (input !== changedInput.target) {
                    input.value = Math.max(0, parseFloat(input.value) + remainingPercentage/(flourInputs.length - 1)).toFixed(2);
                }
            });
        }
    }

    function calculateDoughRecipe() {
        const flourPercents = flourInputs.map(input => parseFloat(input.value));
        // Implement the dough recipe calculation logic here
        // Then call displayResults with the calculated data
    }

    function displayResults(data) {
        // Implement the logic to display the results in the table
    }

    function clearResults() {
        resultsTableBody.innerHTML = '';
    }

    function exportToCSV() {
        // Implement CSV export functionality
    }
});
