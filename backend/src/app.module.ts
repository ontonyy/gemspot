import { Module } from '@nestjs/common'
import { PrismaModule } from './infra/prisma/prisma.module'
import { HealthModule } from './api/health/health.module'
import { PlacesModule } from './api/places/places.module'
import { CategoriesModule } from './api/categories/categories.module'
import { GuidesModule } from './api/guides/guides.module'
import { SubmissionsModule } from './api/submissions/submissions.module'
import { ReportsModule } from './api/reports/reports.module'
import { AuthModule } from './api/auth/auth.module'
import { SavedModule } from './api/saved/saved.module'
import { UploadsModule } from './api/uploads/uploads.module'

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    PlacesModule,
    CategoriesModule,
    GuidesModule,
    SubmissionsModule,
    ReportsModule,
    AuthModule,
    SavedModule,
    UploadsModule,
  ],
})
export class AppModule {}
