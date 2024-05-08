const express = require('express');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');

const app = express();
app.use(bodyParser.json());

const sequelize = new Sequelize('Task', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
});

const User = sequelize.define('user', {
  name: Sequelize.STRING,
});

const Contact = sequelize.define('contact', {
  name: Sequelize.STRING,
  number: Sequelize.STRING, 
});

User.hasMany(Contact);
Contact.belongsTo(User);

sequelize.sync({ force: false })
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(err => {
    console.error('Error syncing database:', err);
  });
  

// Endpoint for syncing user contacts
app.post('/sync-contacts', async (req, res) => {
  
  try {
    const { userId, contacts } = req.body;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // avoiding duplicates
    await Promise.all(
      contacts.map(async contact => {
        await user.createContact(contact, { ignoreDuplicates: true });
      })
    );

    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error syncing contacts:', error);
    res.status(500).json({ success: false, message: 'Error syncing contacts' });
  }
});

// Endpoint for finding common users for a particular number
app.get('/find-common-users', async (req, res) => {
  const { searchNumber } = req.query;

  try {
    const contacts = await Contact.findAll({ where: { number: searchNumber } });
    const commonUsers = contacts.map(contact => contact.userId);
    const userNames = await User.findAll({ where: { id: commonUsers } });

    res.json({
      Name: userNames.length > 0 ? userNames[0].name : '',
      commonUsers: commonUsers,
    });
  } catch (error) {
    console.error('Error finding common users:', error);
    res.status(500).json({ success: false, message: 'Error finding common users' });
  }
});

// Endpoint for getting contacts by userId with pagination and name search
app.get('/get-contacts', async (req, res) => {
    const { userId, page = 1, pageSize = 10, searchText } = req.query;
  
    try {
      const whereClause = {
        userId: userId,
      };
  
      if (searchText) {
        whereClause.name = { [Sequelize.Op.iLike]: `%${searchText}%` };
      }
  
      const totalCount = await Contact.count({ where: whereClause });
      const contacts = await Contact.findAll({
        where: whereClause,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
  
      res.json({
        totalCount: totalCount,
        rows: contacts,
      });
    } catch (error) {
      console.error('Error getting contacts:', error);
      res.status(500).json({ success: false, message: 'Error getting contacts' });
    }
  });
  
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
