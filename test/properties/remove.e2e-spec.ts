import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import { AppModule } from 'src/app.module';
import { Category } from 'src/modules/categories/schemas/category.schema';
import { Property } from 'src/modules/properties/schemas/property.schema';
import { User } from 'src/modules/users/schemas/user.schema';
import request from 'supertest';

describe('PropertiesService.remove - E2E', () => {
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

  it('Return NotFoundException when trying to delete a non-existent property', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/properties/${new Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'No property with the provided id found',
    );
  });

  it('Should delete the property successfully and return it', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/properties/${testProperty._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(testProperty._id.toString());
    expect(response.body.title).toBe(testProperty.title);
    expect(response.body.description).toBe(testProperty.description);
    expect(response.body.address).toBe(testProperty.address);
    expect(response.body.city).toBe(testProperty.city);
    expect(response.body.state).toBe(testProperty.state);
    expect(response.body.price).toBe(testProperty.price);
    expect(response.body.transactionType).toBe(testProperty.transactionType);
    expect(response.body.bedroom).toBe(testProperty.bedroom);
    expect(response.body.bathroom).toBe(testProperty.bathroom);
    expect(response.body.livingRoom).toBe(testProperty.livingRoom);
    expect(response.body.parkingSpace).toBe(testProperty.parkingSpace);
    expect(response.body.pool).toBe(testProperty.pool);
    expect(response.body.ownerId._id).toBe(testUser._id.toString());
    expect(response.body.categoryId._id).toBe(testCategory._id.toString());
    expect(response.body.status).toBe(testProperty.status);
    expect(response.body.media).toEqual(
      expect.arrayContaining(testProperty.media),
    );
    expect(response.body.rentDuration).toBe(testProperty.rentDuration);
    expect(response.body.propertySize).toBe(testProperty.propertySize);

    // Verify that the property is actually deleted
    const getResponse = await request(app.getHttpServer())
      .get(`/properties/${testProperty._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResponse.status).toBe(404);
    expect(getResponse.body.message).toBe('No property with the provided id');
  });
});
