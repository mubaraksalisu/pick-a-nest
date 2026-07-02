import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from 'src/modules/users/schemas/user.schema';
import { Category } from 'src/modules/categories/schemas/category.schema';
import { TestAppContext } from './test-app';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
}

/**
 * Inserts a user directly (bypassing register/verify/apply-agent/approve,
 * none of which are under test here) and logs in via the real /auth/login
 * endpoint so the returned token is genuinely issued by the app.
 */
export async function seedUserAndLogin(
  context: TestAppContext,
  overrides: Partial<{
    email: string;
    password: string;
    role: 'user' | 'agent' | 'admin';
    firstName: string;
    lastName: string;
    phone: string;
  }> = {},
): Promise<SeededUser> {
  const email =
    overrides.email ??
    `test-${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password ?? 'correct-horse';

  const userModel: Model<User> = context.moduleFixture.get(
    getModelToken(User.name),
  );
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

  const created = await userModel.create({
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    email,
    password: hashedPassword,
    phone: overrides.phone ?? '08000000000',
    role: overrides.role ?? 'user',
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
  });

  const server: App = context.app.getHttpServer();
  const response = await request(server)
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  return {
    id: created.id as string,
    email,
    password,
    accessToken: response.body.accessToken,
  };
}

export async function seedCategory(
  context: TestAppContext,
  overrides: Partial<{ name: string; icon: string }> = {},
): Promise<string> {
  const categoryModel: Model<Category> = context.moduleFixture.get(
    getModelToken(Category.name),
  );
  const category = await categoryModel.create({
    name: overrides.name ?? `Category-${Math.random().toString(36).slice(2)}`,
    icon: overrides.icon ?? 'home',
  });
  return category.id as string;
}
