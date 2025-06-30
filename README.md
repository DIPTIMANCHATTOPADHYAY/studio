# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

`JWT_SECRET`: A secret key for signing authentication tokens.
`MONGODB_URI`: The connection string for your MongoDB database.

### Administrator Accounts

You can define one or more administrator accounts that will be created when the application first starts.

**For Multiple Admins (Recommended):**

Use the `ADMIN_ACCOUNTS` variable with a JSON array. This is the preferred method.

`ADMIN_ACCOUNTS`: A JSON string containing an array of admin user objects, each with an `email` and `password`.

**For a Single Admin (Legacy):**

If `ADMIN_ACCOUNTS` is not set, the system will fall back to these variables.

`ADMIN_EMAIL`: The email address for the default administrator account.
`ADMIN_PASSWORD`: The password for the default administrator account.

An example `.env` file would look like this:

```
# For multiple admins (use this method)
ADMIN_ACCOUNTS=[{"email":"admin1@example.com","password":"yoursecurepassword1"},{"email":"admin2@example.com","password":"yoursecurepassword2"}]

# Or for a single admin (legacy method)
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=yoursecurepassword

JWT_SECRET=a-very-long-and-random-secret-string
MONGODB_URI=mongodb+srv://...
```
# sms
# sms
# sms
