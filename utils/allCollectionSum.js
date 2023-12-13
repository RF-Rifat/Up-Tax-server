export const houseAssessmentSum = async (cursor) => {


  const documents = await cursor.toArray();
  // console.log(documents);

  const sum = documents.reduce(
    (accumulator, doc) => accumulator + Number(doc.tax_based_on_assessment),
    0
  );
  console.log(sum);
  return sum;
};


