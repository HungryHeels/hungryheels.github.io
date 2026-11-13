import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dishSprite, spriteForDish, stationSprite } from '../src/client/dish-sprite.ts';

const cases = (pairs: Array<[string, string]>) => { for (const [name, want] of pairs) assert.equal(spriteForDish(name), want, name); };

// Bug fixed Nov 13: pictures were picked by the first food word, or by main/side, so a cheesecake showed an apple,
// cream cheese showed fruit and a plain side showed a soup bowl. The kind of dish is the LAST food word.
test('BUG: the picture comes from the kind of dish, not the first food word in its name', () => {
  cases([['Blueberry Swirl Cheesecake', 'cake'], ['Strawberry Cream Cheese', 'sauce'], ['Mango Thai Shrimp', 'shrimp'],
    ['Orange Spice French Toast', 'pancake'], ['Chicken Noodle Soup', 'soup'], ['Grilled Cheese Sandwich', 'sandwich'],
    ['Banana Peppers', 'veg'], ['Hamburger Bun', 'bread'], ['Vegan Oreo Cookies', 'cookie'], ['Honey Mustard Ham', 'meat'],
    ['Diet Dr. Pepper®', 'drink'], ['Apple Jacks®', 'cereal'], ['Gatorade® Orange', 'drink'], ['Steamed Broccoli', 'veg'], ['Red Grapes', 'fruit']]);
});

test('dish sprite: "X and Y" names are X when Y is one plain food', () => {
  cases([['Shrimp and Grits', 'shrimp'], ['Macaroni and Cheese', 'pasta'], ['Red Beans & Rice', 'beans'], ['Beef & Broccoli Stir-Fry', 'meat'],
    ['Black Beans & Roasted Corn', 'beans']]);
  // ...but not when "and" only joins the toppings of the last food
  cases([['Bacon & Onion Green Beans', 'veg'], ['Bacon and Scallion Mashed Potatoes', 'potato'], ['Chicken & Cheese Quesadilla', 'taco']]);
});

test('dish sprite: "with …", brand marks and "(Made Without Gluten)" never decide the picture', () => {
  cases([['Pork Ribs with BBQ Sauce', 'meat'], ['Yellow Cake with Chocolate Fudge', 'cake'], ['Penne Pasta (Made without Gluten) with Marinara Sauce', 'pasta'],
    ['Chicken Pot Pie', 'chicken'], ['Vegan Chicken Stir Fry', 'chicken'], ['Thai Red Curry', 'bowl']]);
});

test('dish sprite: unknown dishes get the neutral plate, never a guess; stations only fill in when the name says nothing', () => {
  assert.equal(dishSprite('Stress Less Special'), null);
  assert.equal(spriteForDish('Stress Less Special'), 'plate');
  assert.equal(spriteForDish('Starry', 'Beverages'), 'drink');
  assert.equal(spriteForDish('Dragon Roll', 'Sushi/Create'), 'sushi');
  assert.equal(spriteForDish('Dinner Rolls', 'Bakery'), 'bread');
});

test('station sprite: only when the station name names a food; "Bar" never means a dessert bar', () => {
  assert.equal(stationSprite('Hummus Bar'), 'sauce');
  assert.equal(stationSprite('Salad Bar'), 'salad');
  assert.equal(stationSprite('Pizza'), 'pizza');
  assert.equal(stationSprite('Deli'), 'sandwich');
  assert.equal(stationSprite('The Griddle'), null);
  assert.equal(stationSprite('Stress Less Cabinet'), null);
});

test('dish sprite: local favourites get their own picture only when the dish name says so', () => {
  cases([['Chicken Biscuit', 'biscuit'], ['Southern Biscuit', 'biscuit'], ['Eastern Carolina Pulled Pork', 'bbq'], ['Hush Puppies', 'bbq'],
    ['Southern Sweet Tea', 'tea'], ['Tropicana® Lemonade', 'tea'], ['Hot Tea', 'coffee'], ['BBQ Chicken Pizza', 'pizza'], ['Roasted Pork Loin', 'meat'],
    ['BBQ Baked Beans', 'beans']]);
});
