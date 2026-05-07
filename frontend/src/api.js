const BASE_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`;

const request = async (path, options = {}) => {
  const token = localStorage.getItem("ucash_token");

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error("Failed to connect to the server.");
  }

  let data = null;
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text ? { message: text } : null;
    }
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

export const authAPI = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: ({ name, email, phone, password }) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    }),

  getMe: () => request("/auth/me"),

  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: () => {
    localStorage.removeItem("ucash_token");
    return Promise.resolve();
  },
};

export const walletAPI = {
  getBalance: () => request("/wallet/balance"),

  topup: (amount, category, referenceNumber) =>
    request("/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ amount, category, referenceNumber }),
    }),

  withdraw: (amount, category) =>
    request("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount, category }),
    }),

  payFee: (feeId, amount) =>
    request("/wallet/pay", {
      method: "POST",
      body: JSON.stringify({ feeId, amount }),
    }),
};

export const transactionAPI = {
  getMyTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions/my${q ? `?${q}` : ""}`);
  },

  getById: (id) => request(`/transactions/${id}`),

  getReceipt: (id) => request(`/transactions/receipt/${id}`),

  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions/admin/all${q ? `?${q}` : ""}`);
  },

  verify: (id) =>
    request(`/transactions/${id}/verify`, {
      method: "PUT",
    }),

  reject: (id, reason) =>
    request(`/transactions/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),
};

export const paymentMethodAPI = {
  getAll: () => request("/payment-methods"),

  add: ({ type, accountNumber, accountName, isPrimary = false }) =>
    request("/payment-methods", {
      method: "POST",
      body: JSON.stringify({
        type,
        accountNumber,
        accountName,
        isPrimary,
      }),
    }),

  setPrimary: (id) =>
    request(`/payment-methods/${id}/primary`, {
      method: "PUT",
    }),

  remove: (id) =>
    request(`/payment-methods/${id}`, {
      method: "DELETE",
    }),
};

export const userAPI = {
  getProfile: () => request("/users/profile"),

  updateProfile: ({ name, phone }) =>
    request("/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name, phone }),
    }),

  getFees: () => request("/users/fees"),
};

export const adminAPI = {
  getStats: () => request("/admin/stats"),

  getStudents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/students${q ? `?${q}` : ""}`);
  },

  createStudent: ({ name, email, phone, password, studentId, course, year }) =>
    request("/admin/students", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        studentId,
        course,
        year,
      }),
    }),

  updateStudent: (id, { name, email, phone, course, year, status }) =>
    request(`/admin/students/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        email,
        phone,
        course,
        year,
        status,
      }),
    }),

  suspendStudent: (id) =>
    request(`/admin/students/${id}/suspend`, {
      method: "PUT",
    }),

  deleteStudent: (id) =>
    request(`/admin/students/${id}`, {
      method: "DELETE",
    }),
};