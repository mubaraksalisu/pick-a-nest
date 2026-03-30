import { INestApplication, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { AppModule } from 'src/app.module';
import { Category } from 'src/modules/categories/schemas/category.schema';
import { User } from 'src/modules/users/schemas/user.schema';
import { Property } from 'src/modules/properties/schemas/property.schema';
import * as request from 'supertest';
import { Types } from 'mongoose';

describe('PropertiesService.create - E2E', () => {
  let app: INestApplication;
  let dbConnection: Connection;
  let jwtService: JwtService;
  let authToken: string;
  let userModel: Model<User>;
  let categoryModel: Model<Category>;
  let propertyModel: Model<Property>;
  let testUser: any;
  let testCategory: any;
  let testProperty: any;

  let propertyDto = {
    title: 'duplex',
    description: 'A beautiful duplex in the heart of the city',
    address: '123 Main Street',
    city: 'New York',
    state: 'New York',
    price: 500000,
    transactionType: 'sell',
    bedroom: 3,
    bathroom: 2,
    livingRoom: 1,
    parkingSpace: 2,
    pool: 1,
    ownerId: 'owner1',
    categoryId: 'category1',
    status: 'available',
    media: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
    rentDuration: 'monthly',
    propertySize: '2000 sqft',
  };

  let categoryDto = {
    name: 'Apartment',
    description: 'Residential apartments',
    icon: 'apartment-icon.png',
  };

  let userDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'user',
    phone: '123-456-7890',
    active: true,
    imageUrl: 'http://example.com/image.jpg',
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dbConnection = moduleFixture.get<Connection>(getConnectionToken());
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
    categoryModel = moduleFixture.get<Model<Category>>(
      getModelToken(Category.name),
    );
    propertyModel = moduleFixture.get<Model<Property>>(
      getModelToken(Property.name),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    testUser = await userModel.create(userDto);
    testCategory = await categoryModel.create(categoryDto);
    testProperty = await propertyModel.create({
      ...propertyDto,
      ownerId: testUser._id,
      categoryId: testCategory._id,
    });

    authToken = jwtService.sign({
      sub: testUser._id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    await dbConnection.dropDatabase();
    await app.close();
  });

  it("Should return NotFoundException if categoryId doesn't exist", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/properties/${testProperty._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        categoryId: new Types.ObjectId().toString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'No category found with the provided id',
    );
  });

  it("Should return NotFoundException if propertyId doesn't exist", async () => {
    const response = await request(app.getHttpServer())
      .patch(`/properties/${new Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Duplex',
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'No property with the provided id found',
    );
  });

  it('Should update the property and return updated details', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/properties/${testProperty._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Duplex',
        price: 550000,
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Duplex');
    expect(response.body.price).toBe(550000);
  });
});
