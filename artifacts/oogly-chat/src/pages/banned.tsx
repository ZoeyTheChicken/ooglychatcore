// pages/banned.tsx
import { useEffect, useState } from "react";
import { useLocation } from "wouter"; // Change this line
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ban, Clock, LogOut } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function BannedPage() {
  const [, setLocation] = useLocation(); // Change this line
  const { logout, banInfo, clearBanInfo } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!banInfo) {
      setLocation("/login"); // Change this line
    }
  }, [banInfo, setLocation]); // Change this line

  useEffect(() => {
    if (banInfo?.expiresAt) {
      const updateRemaining = () => {
        const expiry = new Date(banInfo.expiresAt);
        const now = new Date();
        
        if (expiry > now) {
          setTimeRemaining(formatDistanceToNow(expiry, { addSuffix: true }));
        } else {
          setTimeRemaining("Any moment now");
          // Try to re-authenticate after ban expires
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      };
      
      updateRemaining();
      const interval = setInterval(updateRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [banInfo]);

  const handleLogout = () => {
    logout();
    clearBanInfo();
    setLocation("/login"); // Change this line
  };

  if (!banInfo) {
    return null;
  }

  const isPermanent = !banInfo.expiresAt;
  const expiryDate = banInfo.expiresAt ? new Date(banInfo.expiresAt) : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
      <Card className="w-full max-w-md shadow-xl border-red-200 dark:border-red-800">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
            Account Banned
          </CardTitle>
          <CardDescription className="text-base">
            Your account has been suspended from Oogly Chat
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Reason */}
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
              Reason for ban:
            </p>
            <p className="text-gray-800 dark:text-gray-200">
              {banInfo.reason || "No reason provided"}
            </p>
          </div>

          {/* Duration Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            {isPermanent ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
                  <Ban className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Permanent Ban
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This ban is permanent and will not expire
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Temporary Ban
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Expires {timeRemaining || formatDistanceToNow(expiryDate!, { addSuffix: true })}
                  </p>
                  {expiryDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      {format(expiryDate, "PPPPpp")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Appeal Info */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>If you believe this was a mistake, please contact an administrator.</p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center pb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
