import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import { AppModule } from 'src/app.module';
import { Category } from 'src/modules/categories/schemas/category.schema';
import { Property } from 'src/modules/properties/schemas/property.schema';
import { User } from 'src/modules/users/schemas/user.schema';
import * as request from 'supertest';

describe('PropertiesService.findOne - E2E', () => {
  let app: INestApplication;
  let dbConnection: Connection;
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

    testUser = await userModel.create(userDto);
    testCategory = await categoryModel.create(categoryDto);
    testProperty = await propertyModel.create({
      ...propertyDto,
      ownerId: testUser._id,
      categoryId: testCategory._id,
    });
  });

  afterAll(async () => {
    await dbConnection.dropDatabase();
    await app.close();
  });

  it('should return NotFoundException if no property with the provided id exists', async () => {
    const nonExistentId = new Types.ObjectId().toString();
    const response = await request(app.getHttpServer())
      .get(`/properties/${nonExistentId}`)
      .expect(404);

    expect(response.body.message).toBe('No property with the provided id');
  });

  it('should return the property if it exists', async () => {
    const response = await request(app.getHttpServer())
      .get(`/properties/${testProperty._id}`)
      .expect(200);

    expect(response.body._id).toBe(testProperty._id.toString());
    expect(response.body.title).toBe(propertyDto.title);
    expect(response.body.description).toBe(propertyDto.description);
    expect(response.body.address).toBe(propertyDto.address);
    expect(response.body.city).toBe(propertyDto.city);
    expect(response.body.state).toBe(propertyDto.state);
    expect(response.body.price).toBe(propertyDto.price);
    expect(response.body.transactionType).toBe(propertyDto.transactionType);
    expect(response.body.bedroom).toBe(propertyDto.bedroom);
    expect(response.body.bathroom).toBe(propertyDto.bathroom);
    expect(response.body.livingRoom).toBe(propertyDto.livingRoom);
    expect(response.body.parkingSpace).toBe(propertyDto.parkingSpace);
    expect(response.body.pool).toBe(propertyDto.pool);
    expect(response.body.ownerId._id).toBe(testUser._id.toString());
    expect(response.body.categoryId._id).toBe(testCategory._id.toString());
    expect(response.body.status).toBe(propertyDto.status);
    expect(response.body.media).toEqual(propertyDto.media);
    expect(response.body.rentDuration).toBe(propertyDto.rentDuration);
    expect(response.body.propertySize).toBe(propertyDto.propertySize);
  });
});
