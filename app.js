const a = 5;
const b = {
  b: 1,
  c: {
    d: {
      a: 5,
    },
  },
};

const {
  c: {
    d: { a: result },
  },
} = b;

console.log(result);
console.log(b.c.d.a);
// sum.js

