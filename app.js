const express = require("express");
const bodyParser = require("body-parser");
const graphqlHttp = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Event = require("./models/event");
const User = require("./models/user");

const app = express();

app.use(bodyParser.json());

app.use(
  "/graphql",
  graphqlHttp.graphqlHTTP({
    schema: buildSchema(`
    type Event{
        _id: ID!
        title: String!
        description: String!
        price: Float!
        date: String!
    }

    type User {
        email: String!
        password: String
    }

    input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!
    }

    input UserInput {
        email: String!
        password: String!
    }


    type RootQuery {
        events: [Event!]!
        user:[User!]!
    }    
    
    type RootMutation{
        createEvent(eventInput: EventInput!): Event!
        createUser(userInput: UserInput!): User!
    }

    schema {
        query: RootQuery,
        mutation: RootMutation
    }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then((result) => {
            return result;
          })
          .catch((error) => {
            throw error;
          });
      },
      createEvent: (args) => {
        let event = {
          //   _id: Math.random().toString(),
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: "62ac742821b6f769dbf58398",
        };
        let createdEvent;
        const dbEvent = new Event(event);
        return dbEvent
          .save()
          .then((result) => {
            createdEvent = result;
            console.log("Saved:", result);
            return User.findById("62ac742821b6f769dbf58398");
          })
          .then((user) => {
            if (!user) {
              throw new Error("User not found");
            }
            user.createdEvents.push(dbEvent);
            return user.save();
          })
          .then(() => {
            return createdEvent;
          })
          .catch((err) => {
            console.log("Error:", err);
            throw err;
          });
      },
      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            if (user) {
              throw new Error("User already exists!");
            }
            return bcrypt.hash(args.userInput.password, 12);
          })
          .then((hashedPwd) => {
            const user = new User({
              email: args.userInput.email,
              password: hashedPwd,
            });
            return user.save();
          })
          .then((result) => {
            return result;
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.etio5.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  )
  .then((result) => {
    console.log("Connected to db", process.env.MONGO_DB);
    app.listen(3000, () => {
      console.log("Server up on port: 3000");
    });
  })
  .catch((error) => {
    console.log(error);
  });
