# Sourdough Recipe Calculator

This is a JavaScript function that calculates the recipe for a sourdough dough given the desired final mass, hydration, and the percentages of different flour types and salt.

The function returns an object with the following properties:
- dateTime: the date and time when the recipe was calculated
- flour1Mass: the mass of the first type of flour
- flour2Mass: the mass of the second type of flour
- flourTotal: the total mass of flour
- waterMass: the mass of water
- saltMass: the mass of salt
- starterMass: the mass of sourdough starter

The function can be called with the following arguments:
- finalMass (default 750): the desired final mass of the dough in grams
- hydration (default 72): the hydration percentage of the dough
- flour1Percent (default 80): the percentage of the first type of flour in the total flour mass
- flour2Percent (default 20): the percentage of the second type of flour in the total flour mass
- saltPercent (default 2.5): the percentage of salt in the total flour mass
- starterPercent (default 16): the percentage of sourdough starter in the final dough mass

The function can be used in a web page that allows the user to enter the input values and display the calculated recipe in a table. The code also includes listeners for the "calculate recipe" button and for the "enter" key on the input fields to trigger the calculation.

