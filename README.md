# 🎯 Placement Tracker

A full-stack MERN application to track job applications and placement progress. Built with Node.js, Express, MongoDB, and a modern dark-themed UI.

## ✨ Features

- **User Authentication**: JWT-based login/signup with separate admin/user flows
- **Application Tracking**: Add, edit, and track job applications
- **Status Management**: Mark applications as "remaining" or "applied"
- **Multi-User Support**: Each user sees only their applications
- **Admin Panel**: View all users and applications (admin only)
- **File Upload**: Upload company logos/images
- **SMS Notifications**: Daily motivation SMS via Twilio (optional)
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT, bcryptjs
- **File Upload**: Multer
- **SMS**: Twilio (optional)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Styling**: Modern dark theme with CSS Grid/Flexbox

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/placement-tracker.git
cd placement-tracker/server
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the server directory:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key
ADMIN_SIGNUP_KEY=your-admin-signup-key
PORT=4000
# Optional: Twilio for SMS
TWILIO_SID=your-twilio-sid
TWILIO_TOKEN=your-twilio-token
TWILIO_FROM=your-twilio-phone
```

4. **Start the server**
```bash
npm run dev
```

5. **Open in browser**
Navigate to `http://localhost:4000`

## 📱 Usage

### User Registration
1. Click "Sign up" tab
2. Fill in: Email, Username, Phone, Password
3. Click "Create account"

### Adding Applications
1. Login with your credentials
2. Fill in company details:
   - Company name
   - Website URL
   - Application date
   - Status (remaining/applied)
   - Notes (optional)
   - Company logo (optional)
3. Click "Add"

### Managing Applications
- **View**: See all your applications in a table
- **Filter**: Filter by "All" or "Remaining" status
- **Edit**: Click "Toggle" to change status
- **Delete**: Click "Delete" to remove applications

### Admin Features
- **Admin Signup**: Use `/auth/admin/signup` with admin key
- **View All Users**: Access user list via admin panel
- **View All Applications**: See applications from all users

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/admin/signup` - Admin registration
- `POST /auth/admin/login` - Admin login

### Applications
- `GET /applications` - Get user's applications
- `POST /applications` - Create new application
- `PUT /applications/:id` - Update application
- `DELETE /applications/:id` - Delete application
- `POST /applications/:id/mark-applied` - Mark as applied
- `POST /applications/:id/mark-remaining` - Mark as remaining

### Admin
- `GET /admin/users` - List all users
- `GET /admin/applications` - List all applications

### Utilities
- `GET /health` - Health check
- `GET /db-health` - Database connection status
- `POST /upload` - File upload
- `POST /events/app-open` - App open event (SMS)

## 🗄️ Database Schema

### User Model
```javascript
{
  email: String (unique),
  username: String (unique),
  passwordHash: String,
  role: String (enum: ['user', 'admin']),
  phoneE164: String,
  timestamps: true
}
```

### Application Model
```javascript
{
  userId: ObjectId (ref: User),
  companyName: String,
  websiteUrl: String,
  appliedAt: Date,
  imageUrl: String,
  status: String (enum: ['remaining', 'applied']),
  notes: String,
  timestamps: true
}
```

## 🔒 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Server-side validation
- **CORS Protection**: Configured for production
- **Rate Limiting**: Built-in protection
- **SQL Injection Protection**: MongoDB ODM

## 🚀 Deployment

### Render (Recommended)
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables
4. Deploy

### Railway
1. Connect GitHub repo
2. Add environment variables
3. Deploy automatically

### Heroku
```bash
heroku create your-app-name
heroku config:set MONGO_URI=your-mongo-uri
git push heroku main
```

## 📊 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `ADMIN_SIGNUP_KEY` | Key for admin registration | Yes |
| `PORT` | Server port | No (default: 4000) |
| `TWILIO_SID` | Twilio account SID | No |
| `TWILIO_TOKEN` | Twilio auth token | No |
| `TWILIO_FROM` | Twilio phone number | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the code comments
- **Community**: Join our discussions

## 🙏 Acknowledgments

- MongoDB Atlas for database hosting
- Twilio for SMS functionality
- Express.js community
- All contributors and users

---

**Made with ❤️ for job seekers and placement tracking**
