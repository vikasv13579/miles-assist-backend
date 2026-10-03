CREATE TABLE "DashboardSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maintenanceScheduledAt" TIMESTAMP(3),
    "runtimeMemoryAlertThreshold" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSettings_pkey" PRIMARY KEY ("id")
);
