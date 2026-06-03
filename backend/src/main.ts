import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  // CORS — comma-separated CORS_ORIGIN in prod (GitHub Pages origin);
  // reflect any origin in dev when unset.
  const origin = process.env.CORS_ORIGIN
  app.enableCors({
    origin: origin ? origin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )

  const port = Number(process.env.PORT) || 4000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`GemSpot API listening on :${port}`)
}

bootstrap()
