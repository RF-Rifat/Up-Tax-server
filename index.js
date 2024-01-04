const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;

// const uri = `mongodb+srv://up-tax:${process.env.DB_PASS}@cluster0.8n7d0sc.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://up-tax:${process.env.DB_PASS}@cluster0.74fodfg.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Inserting all the data to the database complete

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const villagesCollection = client.db("unionCouncil").collection("villages");
    const taxCollection = client.db("unionCouncil").collection("tax");
    const houseHolderCollection = client.db("unionCouncil").collection("house");

    const businessCollection = client.db("unionCouncil").collection("business");
    const usersCollection = client.db("unionCouncil").collection("users");
    const homeTaxCollection = client.db("unionCouncil").collection("homeTax");
    const businessTaxCollection = client
      .db("unionCouncil")
      .collection("businessTax");
    const settingsCollection = client.db("unionCouncil").collection("settings");

    /*
     * GET METHODS
     */

    // count data
    app.get("/collection/totalCount", async (req, res) => {
      const totalCount = {
        house: 0,
        villages: 0,
        homeTax: 0,
        businessTax: 0,
        business: 0,
        totalHomeAssessmentTax: 0,
        totalBusinessAssessmentTax: 0,
        totalHomePaidTax: 0,
        totalBusinessPaidTax: 0,
        todayPayment: 0,
      };
      try {
        totalCount.house = await houseHolderCollection.estimatedDocumentCount();

        totalCount.business = await businessCollection.estimatedDocumentCount();

        totalCount.villages = await villagesCollection.estimatedDocumentCount();

        // totalCount.homeTax = await homeTaxCollection.estimatedDocumentCount();

        totalCount.businessTax =
          await businessTaxCollection.estimatedDocumentCount();

        //tax count

        // home assessment total
        const homeAssessmentTaxDoc = await houseHolderCollection
          .find({}, { projection: { tax_based_on_assessment: 1, _id: 0 } })
          .toArray();

        const homeAssessmentSum = homeAssessmentTaxDoc.reduce(
          (accumulator, doc) =>
            accumulator + Number(doc.tax_based_on_assessment),
          0
        );
        totalCount.totalHomeAssessmentTax = homeAssessmentSum;

        // home tax paid total
        // const query = {type}
        const homePaidTaxDoc = await taxCollection
          .find(
            { type: "household" },
            // {_id:new ObjectId('657bd00e268523a156f498f6')},
            { projection: { amount: 1, _id: 0 } }
          )
          .toArray();
        const homePaidSum = homePaidTaxDoc.reduce(
          (accumulator, doc) => accumulator + Number(doc.amount),
          0
        );
        totalCount.totalHomePaidTax = homePaidSum;

        //total business Assessment tax
        const businessAssessmentTaxDoc = await businessCollection
          .find({}, { projection: { assesment_tax: 1, _id: 0 } })
          .toArray();

        const businessAssessmentSum = businessAssessmentTaxDoc.reduce(
          (accumulator, doc) => accumulator + Number(doc.assesment_tax),
          0
        );
        totalCount.totalBusinessAssessmentTax = businessAssessmentSum;

        // Business tax paid total

        const businessPaidTaxDoc = await taxCollection
          .find({ type: "business" }, { projection: { amount: 1, _id: 0 } })
          .toArray();

        const businessPaidSum = businessPaidTaxDoc.reduce(
          (accumulator, doc) => accumulator + Number(doc.amount),
          0
        );
        totalCount.totalBusinessPaidTax = businessPaidSum;

        // Today's Payment
        const today = new Date();
        const formattedToday = today.toDateString();

        // Get today's total pay
        const todayTotalPayDoc = await taxCollection
          .find(
            { PaymentDate: formattedToday },
            { projection: { amount: 1, type: 1, _id: 0 } }
          )
          .toArray();

        totalCount.todayPayment = todayTotalPayDoc.reduce(
          (accumulator, doc) => {
            if (doc.type === "business" || doc.type === "household") {
              return accumulator + Number(doc.amount);
            }
            return accumulator;
          },
          0
        );

        res.send(totalCount);
      } catch (error) {
        console.log(error);
        res.status(500).send("There was a server side error!!");
      }
    });

    // get all documents data  from a collection based on types and paginated value
    // [house, business, villages, user, homeTax, businessTax]
    app.get("/collection/:type", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 0;
        const size = parseInt(req.query.size);
        const type = req.params.type;

        const { field, search } = req.query;
        const searchQuery = {};
        if (search && field) {
          const searchRegex = new RegExp(req.query.search, "i");

          const searchField = [
            "holding_number",
            "national_id",
            "head_of_household_mobile",
            "head_of_household_name",
            "father_or_husband_name",
            "word",
          ];

          searchField.forEach((f) => {
            if (f === field) {
              searchQuery[f] = searchRegex;
            }
          });

          // "business" collection
          if (type.toLowerCase() === "business") {
            const businessSearchField = ["shop_no", "owner_name", "phone"];

            businessSearchField.forEach((f) => {
              if (f === field) {
                searchQuery[f] = searchRegex;
              }
            });
          }
        }

        let result;

        if (type.toLowerCase().trim() === "house") {
          result = await houseHolderCollection
            .find(searchQuery)
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        } else if (type.toLowerCase().trim() === "business") {
          result = await businessCollection
            .find(searchQuery)
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        } else if (type.toLowerCase().trim() === "villages") {
          result = await villagesCollection
            .find()
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        } else if (type.toLowerCase().trim() === "users") {
          result = await usersCollection
            .find()
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        }
        /////
        else if (type.toLowerCase().trim() === "tax") {
          result = await taxCollection
            .find()
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        } else if (type.toLowerCase().trim() === "settings") {
          result = await settingsCollection
            .find()
            .sort({ _id: -1 })
            .skip(page * size)
            .limit(size)
            .toArray();
        }

        // res.send(result);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    // get single documents data  from a collection based on types and paginated value
    // [house, business, villages, user, homeTax, businessTax]
    app.get("/collection/:type/:id", async (req, res) => {
      try {
        const { type, id } = req.params;
        // console.log("page:", page, "size: ", size);
        let result = {};

        const query = { _id: new ObjectId(id) };

        if (type.toLowerCase().trim() === "house") {
          result = await houseHolderCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "business") {
          result = await businessCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "villages") {
          result = await villagesCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "users") {
          result = await usersCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "homeTax") {
          result = await homeTaxCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "businessTax") {
          result = await businessTaxCollection.findOne(query);
        }
        /////
        else if (type.toLowerCase().trim() === "tax") {
          result = await taxCollection.findOne(query);
        } else if (type.toLowerCase().trim() === "settings") {
          result = await settingsCollection.findOne(query);
        }
        res.send(result);
      } catch (error) {
        console.log(error);
        res.send(error);
      }
    });

    // total page count
    app.get("/pageCount", async (req, res) => {
      try {
        let pageCount = {
          houseHolderCount: 0,
          businessCount: 0,
          villagesCount: 0,
          taxCount: 0,
        };
        const houseCount = await houseHolderCollection.estimatedDocumentCount();
        const businessCount = await businessCollection.estimatedDocumentCount();
        const villagesCount = await villagesCollection.estimatedDocumentCount();
        const taxCount = await taxCollection.estimatedDocumentCount();
        pageCount.houseHolderCount = houseCount;
        pageCount.businessCount = businessCount;
        pageCount.villagesCount = villagesCount;
        pageCount.taxCount = taxCount;

        res.send(pageCount);
      } catch (error) {
        console.log(error);
      }
    });

    /*
     * POST METHODS
     */

    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body || {};

        const validUser = await usersCollection.findOne({ email });

        if (validUser && validUser.password === password) {
          const token = jwt.sign({ email }, process.env.SECRET_KEY, {
            expiresIn: "1h",
          });

          res
            .cookie("token", token, {
              httpOnly: true,
              secure: false,
              sameSite: "none",
            })
            .send({ success: true, token: token, email });
        } else {
          res.status(401).send("Unauthorized Access");
        }
      } catch (error) {
        res.status(500).send("Internal server error!");
      }
    });

    app.post("/logout", (req, res) => {
      const { email } = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // add a document in a collection based on type
    // [house, business, villages, user, homeTax, businessTax]
    app.post("/collection/:type", async (req, res) => {
      try {
        const type = req.params.type;

        const data = req.body;

        let result;
        if (type.toLowerCase().trim() === "business") {
          result = await businessCollection.insertOne(data);
        } else if (type.toLowerCase().trim() === "house") {
          result = await houseHolderCollection.insertOne(data);
        } else if (type.toLowerCase().trim() === "users") {
          result = await usersCollection.insertOne(data);
        } else if (type.toLowerCase().trim() === "villages") {
          result = await villagesCollection.insertOne(data);
        }
        ////
        else if (type.toLowerCase().trim() === "tax") {
          result = await taxCollection.insertOne(data);
        }

        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    /*
     * PUT METHODS
     */

    // update a specific document from a collection based on type
    // [house, business, villages, user, homeTax, businessTax]
    app.put("/collection/:type/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const type = req.params.type;
        const filter = { _id: new ObjectId(id) };

        const option = { upsert: true };

        const updatedDoc = req.body;

        const newDoc = {
          $set: {
            ...updatedDoc,
          },
        };

        let result;

        if (type.toLowerCase().trim() === "house") {
          result = await houseHolderCollection.updateOne(
            filter,
            newDoc,
            option
          );
        } else if (type.toLowerCase().trim() === "business") {
          result = await businessCollection.updateOne(filter, newDoc, option);
        } else if (type.toLowerCase().trim() === "villages") {
          result = await villagesCollection.updateOne(filter, newDoc, option);
        } else if (type.toLowerCase().trim() === "users") {
          result = await usersCollection.updateOne(filter, newDoc, option);
        }

        ////
        else if (type.toLowerCase().trim() === "tax") {
          result = await taxCollection.updateOne(filter, newDoc, option);
        } else if (type.toLowerCase().trim() === "settings") {
          result = await settingsCollection.updateOne(filter, newDoc, option);
        }

        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });

    /*
     * DELETE METHODS
     */

    // delete a specific document from a collection based on type
    // [house, business, villages, user, homeTax, businessTax]
    app.delete("/collection/:type/:id", async (req, res) => {
      try {
        const { type, id } = req.params;
        const query = { _id: new ObjectId(id) };
        let result;

        if (type.toLowerCase().trim() === "house") {
          result = await houseHolderCollection.deleteOne(query);
        } else if (type.toLowerCase().trim() === "business") {
          result = await businessCollection.deleteOne(query);
        } else if (type.toLowerCase().trim() === "villages") {
          result = await villagesCollection.deleteOne(query);
        } else if (type.toLowerCase().trim() === "users") {
          result = await usersCollection.deleteOne(query);
        }

        ////
        else if (type.toLowerCase().trim() === "tax") {
          result = await taxCollection.deleteOne(query);
        } else if (type.toLowerCase().trim() === "settings") {
          result = await settingsCollection.deleteOne(query);
        }
        res.send(result);
      } catch (error) {
        res.send(error);
      }
    });


    //delete All Method
    // app.delete("/collection/house", async (req, res) => {
    //   try {
    //     const result = await houseHolderCollection.deleteMany({});
    //     res.send(`Deleted ${result.deletedCount} documents from the collection`);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });

    
    // Send a ping to confirm a successful connection
    await client.db("users").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server Running...");
});


app.listen(port, () => {
  console.log("Server Running on port", port);
});
