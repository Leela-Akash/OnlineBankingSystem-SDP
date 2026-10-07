import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contextapi/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";

// Public Pages & Layout
import MainNavBar from "./main/MainNavbar";
import Home from "./main/Home";
import About from "./main/About";
import Contact from "./main/Contact";
import NotFound from "./main/NotFound";
import CustomerLogin from "./customer/CustomerLogin";
import CustomerRegistration from "./customer/CustomerRegistration";
import StaffLogin from "./staff/StaffLogin";
import AdminLogin from "./admin/AdminLogin";

// Customer Pages & Layout
import CustomerNavBar from "./customer/CustomerNavbar";
import CustomerProfile from "./customer/CustomerProfile";
import DepositWithdraw from "./customer/DepositWithdraw";
import Statements from "./customer/Statements";
import Transferfunds from "./customer/Transferfunds";
import Loans from "./customer/Loans";
import Notifications from "./customer/Notifications";
import CustomerUpdateProfile from "./customer/UpdateProfile";

// Staff Pages & Layout
import StaffNavBar from "./staff/StaffNavbar";
import StaffDashboard from "./staff/StaffDashboard";
import StaffProfile from "./staff/StaffProfile";
import Transactions from "./staff/Transactions";
import ViewAllCustomers from "./staff/ViewAllCustomers";
import LoanApproval from "./staff/LoanApproval";

// Admin Pages & Layout
import AdminNavBar from "./admin/AdminNavbar";
import AdminDashboard from "./admin/AdminDashboard";
import ManageCustomers from "./admin/ManageCustomers";
import ManageStaff from "./admin/ManageStaff";
import AddStaff from "./admin/AddStaff";
import Reports from "./admin/Reports";
import AllTransactions from "./admin/AllTransactions";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Layout */}
            <Route element={<MainNavBar />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/customerlogin" element={<CustomerLogin />} />
              <Route path="/customerregistration" element={<CustomerRegistration />} />
              <Route path="/stafflogin" element={<StaffLogin />} />
              <Route path="/adminlogin" element={<AdminLogin />} />
            </Route>

            {/* Customer Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
              <Route element={<CustomerNavBar />}>
                <Route path="/customer/profile" element={<CustomerProfile />} />
                <Route path="/profile" element={<CustomerProfile />} />
                <Route path="/customer/deposit-withdraw" element={<DepositWithdraw />} />
                <Route path="/customer/statements" element={<Statements />} />
                <Route path="/funds" element={<Transferfunds />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/update" element={<CustomerUpdateProfile />} />
              </Route>
            </Route>

            {/* Staff Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["STAFF", "ADMIN"]} />}>
              <Route element={<StaffNavBar />}>
                <Route path="/dashboard" element={<StaffDashboard />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/staffloans" element={<LoanApproval />} />
                <Route path="/customers" element={<ViewAllCustomers />} />
                <Route path="/staff/profile" element={<StaffProfile />} />
              </Route>
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
              <Route element={<AdminNavBar />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/managecustomers" element={<ManageCustomers />} />
                <Route path="/admin/manage-customers" element={<ManageCustomers />} />
                <Route path="/managestaff" element={<ManageStaff />} />
                <Route path="/admin/manage-staff" element={<ManageStaff />} />
                <Route path="/addstaff" element={<AddStaff />} />
                <Route path="/admin/add-staff" element={<AddStaff />} />
                <Route path="/staff/reports" element={<Reports />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/customer/transactions" element={<AllTransactions />} />
                <Route path="/admin/all-transactions" element={<AllTransactions />} />
              </Route>
            </Route>

            {/* 404 Catch-All Route placed strictly last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
