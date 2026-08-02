-- CreateTable
CREATE TABLE "WeatherCache" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'boort',
    "tempC" REAL NOT NULL,
    "tempMaxC" REAL,
    "tempMinC" REAL,
    "windKmh" INTEGER,
    "windDirection" TEXT,
    "rainChance" INTEGER,
    "summary" TEXT NOT NULL,
    "iconDescriptor" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
