import pandas as pd
import datetime

def calculate_dough_recipe(df, final_mass=750, hydration=.72, flour_1_percent=80,
                           flour_2_percent=20, flour_3_percent=0, salt_percent=.025,
                           starter_percent=.16):

    # Calculate the mass of sourdough starter
    starter_mass = final_mass * starter_percent

    # Calculate the total flour mass
    flour_mass = (final_mass - starter_mass * (salt_percent + hydration + 1) / 2) / (salt_percent + hydration + 1)

    # Calculate the total water mass from (hydration of total flour mass) plus (half of the starter mass times
    # hydration-1)
    water_mass = flour_mass * hydration + starter_mass / 2 * (hydration - 1)


    # Calculate the mass of each flour type
    flour_1_mass = flour_mass * flour_1_percent / 100
    flour_2_mass = flour_mass * flour_2_percent / 100
    flour_3_mass = flour_mass * flour_3_percent / 100



    # Calculate the mass of salt from the total flour mass and half of the starter mass
    salt_mass = (flour_mass + starter_mass / 2) * salt_percent


    # Get the current date and time
    now = datetime.datetime.now()

    # Append the results to the input dataframe
    df.loc[now, "Flour 1 (g)"] = flour_1_mass
    df.loc[now, "Flour 2 (g)"] = flour_2_mass
    df.loc[now, "Flour 3 (g)"] = flour_3_mass
    df.loc[now, "Flour Total (g)"] = flour_1_mass + flour_2_mass + flour_3_mass
    df.loc[now, "Water (g)"] = water_mass
    df.loc[now, "Salt (g)"] = salt_mass
    df.loc[now, "Starter (g)"] = starter_mass

#%%
# Create an empty dataframe
df = pd.DataFrame()

# Calculate the dough recipe and append the results to the dataframe
calculate_dough_recipe(df)
df.head()

