//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URL,  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

const itemSchema = new mongoose.Schema ({
  name: {
    type: String,
    required: [true, "An item object must not be empty."]
  }
});

const Item = mongoose.model("Item", itemSchema);

const listSchema = new mongoose.Schema ({
  name: {
    type: String,
    required: [true, "The list needs to have a name."]
  },
  items: [itemSchema]
});

const List = mongoose.model("List", listSchema);


const item1 = new Item ({
  name: "Hi!"
});
const item2 = new Item ({
  name: "Add new items with the plus sign"
});
const item3 = new Item ({
  name: "Remove items using the checkbox"
});

const defaultItems = [item1, item2, item3];

// Get default list and start page

app.get("/", function(req, res) {

  List.find({}, function(err, lists) {
    if (err) { console.log(err); }
    else {
      Item.find({}, function(err, items) {
        if (!items.length) {
          Item.insertMany(defaultItems, function(err) {
            if (err) { console.log(err); }
            else {
              res.redirect("/")
            }
          });
        }
        else {
          res.render("index", {listTitle: "Today's to-do", listItems: items, lists: lists});
        }
      });
    }
  });
});


app.get("/lists/:listName", function(req,res){

  const listName = _.capitalize(req.params.listName);

  List.find({}, function(err, lists) {

  List.findOne({name: listName}, function(err, foundList) {
    if (!err) {
    // Show existing list
      if (foundList) {
        res.render("index", {lists: lists, listTitle: foundList.name, listItems: foundList.items})
          }
    // Create a new todo list
      else {
        console.log("No list pf that name... let's create one...")
        const list = new List ({
           name: listName,
           items: defaultItems
         });
        list.save();
        res.redirect("/lists/" + listName)
        }
      }
    });
  });
});

app.post("/", function(req, res) {
  const listName = req.body.newList;
  const list = new List ({
     name: listName,
     items: defaultItems
   });
  list.save();
  res.redirect("/lists/" + listName)
})


// Post new item to defaulot or custom list

app.post("/lists", function(req, res){
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const newItem = new Item({
    name: itemName
  });

  if (listName === "Today's to-do")
    newItem.save(function(err) {
      if (err) {console.log(err);}
      res.redirect("/");
    });
  else {
    List.findOne({name: listName}, function (err, foundList) {
      if (!err) {
        foundList.items.push(newItem);
        foundList.save();
        res.redirect("/lists/" + listName);
      }
      else { console.log(err)}
    });
  }
});

// Delete an item from a list

app.post("/delete", function(req, res){
  const deleteId = req.body.deleteItem;
  const listName = req.body.listName;

  if (listName === "Today's to-do") {
    Item.findOneAndDelete(deleteId, function (err) {
      if (!err) {
        res.redirect("/");
      }
    });
  }
  else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: deleteId}}}, function (err, foundList) {
      if (!err) {
        res.redirect("/lists/" + listName)
          }
        });
      }
    });

// Get or create custom list

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});
