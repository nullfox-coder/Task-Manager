const sql = require('../../config/pg.db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const login = async (req, res) => {
  try {
    const { username } = req.body;

    // Check if user exists
    const user = await sql`
      SELECT id, username, created_at 
      FROM users 
      WHERE username = ${username}
    `;

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid username' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user[0].id,
        username: user[0].username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user[0].id,
        username: user[0].username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login,
  logout
};
