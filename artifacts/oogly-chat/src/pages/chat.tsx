import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWs } from "@/contexts/WsContext";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const API_BASE_URL = 'https://chatapi.zoeyaviation.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('oogly_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle ban responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.banned) {
      localStorage.setItem('banInfo', JSON.stringify({
        reason: error.response.data.reason,
        expiresAt: error.response.data.expiresAt,
      }));
      window.location.href = '/banned';
    }
    return Promise.reject(error);
  }
);
EOF
