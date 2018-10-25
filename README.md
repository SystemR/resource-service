# Resource Service

Simpler and consistent way for front-end and back-end communication using ORM-like API for Angular, with async/await. Inspired by EF Core, Eloquent, TypeORM, Swagger, and JSON API spec [https://jsonapi.org](https://jsonapi.org).

```ts
// Call your ajax like this:
const users = await userService
  .findAll()
  .only('id', 'name')
  .page(2)
  .limit(100)
  .get();

// Or
const user = await userService.findById(1).get();
user.getName(); // Outputs: firstName lastNAme
```

## Install

```sh
$ npm install @systemr/resource --save
```

## Simple Usage

```ts
import { Resource, ResourceService, ResourceConfigService } from '@systemr/resource';

/**
 * Have your model extends Resource
 */
class User extends Resource {
  static basePath = '/user'; // Base path for this model
  id: number;
  name: string;
}

/**
 * Have the service extends ResourceService
 */
@Injectable({
  providedIn: 'root'
})
class UserService extends ResourceService {
  constructor(injector: Injector) {
    super(injector, User); // call super() with injector and your model class
  }
}

// Then elsewhere in your code you can do:
userService
  .findAll() // Returns a chainable GetQuery instance to add parameters
  .only('id', 'name')
  .page(2)
  .limit(100)
  .get(); // Only when you call get() it will execute

// For the following api call:
// https://api.com/user?only=id,name&page=2&limit=100

// In case your end point is on a different url with CORS, configure ResourceConfigService in AppComponent:
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private resourceConfigService: ResourceConfigService) {
    resourceConfigService.setBaseUrl('https://api.com');
  }
}
```

Note: There is ResourceModule in the package. However, there is no need to import `ResourceModule` into your project's module as there are no concrete classes or components to be imported. ResourceService only provides interfaces and base classes. ResourceConfigService is has providedIn root and possibly need to be declared for pre-angular 6.

## Introduction

### Background

Previously whenever you need to call an end-point, you create a service and use HttpClient such as the following:

```ts
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
class HeroService {
  private heroesUrl = 'api/heroes'; // URL to web api

  constructor(private http: HttpClient) {}

  getHeroes(): Observable<Hero[]> {
    return this.http.get<Hero[]>(this.heroesUrl);
  }
}
```

Over time this becomes repetitive and can get inconsistent between one end-point to another. For example `VillainService` and `getVillain()`.

### Solution

The goal of ResourceService is to enforce consistency, DRY, and flat API for front-end back-end communication.

Taking advantage of TypeScript's ability to do OO, we can create a Base class for back-end communication services, and save time in writing each method for every HTTP Verb by inheriting from it. The result will also be automatically typed to the model class specified for the service.

So later on, connecting another end-point, let's say `/account`, all that's needed is set up `Account` model, and `accountService` that extends from `Resource` and `ResourceService`. Immediately you get the same set of API for CRUD and more: create(), list(), get(), update(), patch(), search(), and upload(). Read below to learn about each of the API.

All the API calls are wrapped in a promise so you can use `async/await`.

Note that this module doesn't have the back-end component. It only maps the front-end to specific url and its expectations upon the result. I'll open source the back-end adapter in the future.

## API/Mapping Summary

Inherited methods:

| Method                                                                                                                   | End Point                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `list(): Promise<ListResponse<T>>`                                                                                       | GET /resource                                             |
| `get(): Promise<T>`                                                                                                      | GET /resource/:id                                         |
| `create(res: Resource): Promise<T>`                                                                                      | POST /resource                                            |
| `update(res: Resource): Promise<T>`                                                                                      | PUT /resource/:id                                         |
| `patch(res: Resource): Promise<T>`                                                                                       | PATCH /resource/:id                                       |
| `remove(res: Resource): Promise<T>`                                                                                      | DELETE /resource/:id                                      |
| `search(searchParams: HttpParams, method: 'get' \| 'delete' \| 'patch' = 'get', resource?: T): Promise<ListResponse<T>>` | (GET \| PATCH \| DELETE) /resource/search?[:searchParams] |

Builder methods (allows you to chain multiple parameters. Requires .get(), .remove(), or .patch() to execute. See GetQuery and SearchQuery below):

| Method                                                                                        | End Point                                                 |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `findAll(): GetQuery<T>`                                                                      | GET /resource                                             |
| `findById(:id): GetQuery<T>`                                                                  | GET /resource/:id                                         |
| `findWhere(field: string, value: string \| number \| Array<string | number>): SearchQuery<T>` | (GET \| DELETE \| PATCH) /resource/search?[:searchParams] |

GetQuery Builder Method Modifiers. Requires `.get()` to execute the chained parameters:

| Method                                          | Example                                                                       | Endpoint                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `only(...fields)`                               | `userService.findAll().only('id', 'name').get();`                             | GET /resource?only=id,name                                    |
|                                                 | `userService.findById(123).only('id', 'name').get();`                         | GET /resource/123?only=id,name                                |
| `limit(num: number)`                            | `userService.findAll().limit(100).get();`                                     | GET /resource?limit=100                                       |
| `page(pageNumber: number)`                      | `userService.findAll().limit(100).page(2).get();`                             | GET /resource?limit=100&page=2                                |
| `orderBy(field: string, type: 'asc' \| 'desc')` | `userService.findAll().orderBy('name', 'asc').orderBy('email','desc').get();` | GET /resource?orderBy=[[name,asc],[email,desc]] (url encoded) |
| `get(): Promise<T \| ListResponse<T>>`          | `userService.findAll().get();`                                                | GET /resource                                                 |
|                                                 | `userService.findById(123).get();`                                            | GET /resource/:id                                             |

SearchQuery (extended from GetQuery class so you can use the modifiers above with the following additional methods)

| Method                                                                                                                                      | Example                                                                             | Endpoint                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `andWhere(field: string, value: string \| number)`                                                                                          | `userService.findWhere('first_name', 'abc').andWhere('last_name', '123').get();`    | GET /resource/search?first_name=abc&last_name=123                |
|                                                                                                                                             | `userService.findWhere('first_name', 'abc').andWhere('last_name', '123').remove();` | DELETE /resource/search?first_name=abc&last_name=123             |
| `get(): Promise<ListResponse<T>>` Note: Unlike GetQuery's .get(), SearchQuery's .get() always return a ListResponse due to multiple results | `userService.findWhere('name', 'abc').get();`                                       | GET /resource/search?name=abc                                    |
| `remove()` Batch DELETE.                                                                                                                    | `userService.findWhere('id', 'abc').remove();`                                      | DELETE /resource/search?id=abc                                   |
|                                                                                                                                             | `userService.findWhere('id', [1,2,3]).remove();`                                    | DELETE /resource/search?id=1,2,3                                 |
|                                                                                                                                             | `userService.findWhere('name', ['abc', 'def']).remove();`                           | DELETE /resource/search?name=abc,def                             |
| `patch(resource: T): Promise<T \| ListResponse<T>>` Batch PATCH                                                                             | `userService.findWhere('id', [3, 4]).patch(<User>{is_banned: 1});`                  | PATCH /resource/search?id=3,4 with request body { is_banned: 1 } |

## API Mapping Details/Examples

The sections below would describe how each API is used. Alternatively you can read the `resource.service.spec.ts` to see how each API is used. Note that whenever there are multiple results in the response, they will be wrapped in `ListResponse` interface (this is inspired by the JSON API spec by Yehuda Katz):

```ts
/**
 * List Response for list, search and their equivalent query builder method (findAll, findWhere)
 */
export interface ListResponse<T> {
  data?: Array<T>;
  meta?: ResponseMeta;
}

/**
 * Metadata on response
 */
export interface ResponseMeta {
  count?: number; // full result count
}
```

By separating the data and its `ResponseMeta` metadata, you can build your UI with paging by offsetting count, page, and limit (and extend the ResponseMeta with your own metadata).

### HTTP GET API (GET /resource)

With RESTful service, doing a GET call to `/user` returns multiple results of type User.

Signature:

```ts
// Single call method
list<T extends Resource>(
  params?: HttpParams,
  headers?: HttpHeaders
): Promise<ListResponse<T>> {}

// Builder method
findAll<T extends Resource>(): GetQuery<T> {}
```

Example:

```ts
// With list() call (GET /user):
userService.list().then((res: ListResponse<User>) => {
  const users = res.data;
  const count = res.meta.count;

  if (count > 100) {
    //Retrieving for the next page is then (using findAll() builder method):
    const page2Result: ListResponse<User> = await userService
      .findAll()
      .page(2)
      .limit(100);

    const page2Users = page2Result.data;
    // This does GET /user?page=2&limit=100;

    // To use list() you can do (not recommended):
    const params = new HttpParams().set('page', '2').set('limit', '1000');
    userService.list(params);
  }
});
```

### HTTP GET API (GET /resource/:id)

To get more detail of a resource you usually call /resource/:id. Calling /user/1 gives you the user detail of id 1.

Signature:

```ts
// Single call method
get<T extends Resource>(
  id: number | string,
  params?: HttpParams,
  headers?: HttpHeaders
): Promise<T> {}

// Builder method
findById<T extends Resource>(id: number | string): GetQuery<T> {}
```

Example:

```ts
userService.get(1).then(
  (result: User) => {
    console.log(result);
    // result at this point has been instantiated with type User
    // if you have methods in User class it will be available.
    // See resource.service.spec.ts
  },
  _ => {}
);

// Or
const user = await userService.findById(1);
```

### HTTP POST API (POST /resource)

To create a resource that needs to be stored in our back-end we need to send a POST request to the resource. With our ResourceService this is easy (Note that back-end can return the full user object, or just the id)):

Signature:

```ts
create<T extends Resource>(resource: T, headers?: HttpHeaders): Promise<T> {}
```

Example:

```ts
const user = new User();
user.name = 'Hello';
userService.create(user).then((res: User) => {
  console.log(user.id); // Back-end should return back an id of the newly created resource.
});
```

Note that the back-end can respond with 200 or 201, and its body can be either { id: 1 } (id only), or { id: 1, name: 'Hello' } (the full user resource). `ResourceService` automatically merges the new information to the original user object that is passed in.

### HTTP PUT API for updates (PUT /resource/:id)

To update a resource we usually need to do a PUT call to a specific /resource/id. Note that in general for PUT you need to send the full object and an empty property could mean you're setting the value to null.

Signature:

```ts
update<T extends Resource>(resource: T, params?: HttpParams, headers?: HttpHeaders): Promise<T> {}
```

Example:

```ts
user.name = 'Hello'; // You want to update the user's name to Hello
userService.update(user).then((res: User) => {
  console.log(user); // Should show id: 1, name: Hello, ...
});
```

Note that the back-end can respond with 200 or 204 No Content, and its body can be either empty, id only, or the full user resource. `ResourceService` automatically merges the new information to the original user object that is passed in.

### HTTP PATCH API for partial updates (PATCH /resource/:id)

To partially update a resource you can do a PATCH call similar to PUT. But by design a PATCH call only update values that are set in the request body.

Signature:

```ts
patch<T extends Resource>(resource: T, params?: HttpParams, headers?: HttpHeaders): Promise<T> {}
```

Example:

```ts
user.name = 'Hello'; // You want to update the user's name to Hello
userService.patch(user).then((res: User) => {
  console.log(user); // Should show id: 1, name: Hello, ...
});

// or just some property such as refreshing its updated_at
userService.patch(<User>{
  id: 1,
  updated_at: new Date();
}).then((res: User) => {
  console.log(user); // Should show id: 1, name: Hello, updated_at: now
})
```

### HTTP DELETE API (DELETE /resource/:id)

To delete a resource on the back-end you can do a DELETE call.

Signature:

```ts
remove<T extends Resource>(resource: T, params?: HttpParams, headers?: HttpHeaders): Promise<T> {}
```

Example:

```ts
userService.remove(user).then(_ => {
  // Then remove the entry from the list
  this.userList.splice(userList.indexOf(user), 1);
});
```

### Search API

Search is added because it's common in projects to be able to search upon a resource and pass parameters.

Signature:

```ts
search<T extends Resource>(
    searchParams: HttpParams,
    method: 'get' | 'patch' | 'delete' = 'get', // Default to get
    resource?: T, // Only for patch
    headers?: HttpHeaders
  ): Promise<ListResponse<T>> {}

// Better way, use builder method
findWhere<T extends Resource>(
    field: string,
    value: number | string | Array<number | string>
  ): SearchQuery<T> {}
```

Example:

```ts
// Do search: https://api.com/user/search?q=123
userService.search(new HttpParams().set('q', '123')).then(
  (response: ListResponse<User>) => {
    const users = response.data;
  },
  _ => {}
);

// Builder method:
async function nextPage() {
  const query = userService
    .findWhere('q', 123)
    .page(this.page++)
    .limit(100);

  if (this.orderBy) {
    query.orderBy(this.orderBy, this.orderByType);
  }

  const result: ListResponse<User> = await query.get();
  this.users = result.data;
}
```

### Bulk Update or Bulk Delete Using Search API

Using the search API, you can perform bulk delete or bulk patch. For example:

```ts
userService.findWhere('id', [1, 2, 3]).remove();
// This sends DELETE request to /user/search?id=1,2,3
// Back-end at this point knows it needs to delete user id 1, 2, and 3

userService
  .findWhere('last_name', ['Bauer', 'Ryan'])
  .patch(<User>{ first_name: 'Jack' })
  .then(_ => {});
// This sends: PATCH request to /user/search?last_name=Bauer,Ryan with body { first_name: 'Jack }.
// Back-end at this point knows it needs to update user with last name Bauer and Ryan and change their first names to be Jack.
```

### Upload API

To use the upload API you need to create a FormData object, and append the files. Here's an example (upon file input change):

```ts
onFileChange(event) {
  if (event.target.files.length > 0) {
    // Generates formData
    const fileList = event.target.files;
    const formData = new FormData();
    for (let i = 0, len = fileList.length; i < len; i++) {
      const file = fileList[i];
      formData.append('files', file, file.webkitRelativePath);
    }

    // UserFile is an interface. upload() and uploadFor() do not wrap the response result into a class
    this.userService.upload(formData).then((res: UserFile) => {
      console.log(res);
    });

    // Or uploadFor
    this.userService.uploadFor(user, formData).then((res: UserFile) => {
      console.log(res);
    });
  }
}
```

## GetQuery modifiers

Whenever you use the builder method `findAll()` and `findById()` they return a new instance of GetQuery that allows you to chain additional parameters.

### only(...fields: string)

only(...fields) allows you to inform the back-end that you only need certain fields returned for that request. This would allow the back-end to optimize the DB `select` query and save on network for its response.

```ts
class User {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  ...
}
const users = await userService.findAll().only('id', 'firstName', 'age').get();
```

If another component needs to display lastName only, then that component would call `userService.findAll().only('id', 'lastName')` without affecting the component that renders list of user's age. This way you don't need a separate method in your service for getting list of users' first name and age, and for list of user's lastName.

### page(num: number) and limit(num: number)

page() and limit() allows you to pass limit and offset request for your back-end's DB query.

```ts
userService
  .findAll()
  .limit(100)
  .page(2)
  .get();
```

### orderBy(field: string, type: 'asc' | 'desc' = 'asc')

orderBy allows you to pass `&orderBy=` parameter to the back-end. Note that the values are URL encoded.

```ts
userService.findAll().orderBy('name', 'asc').orderBy('email', 'desc').get();`
// GET /resource?orderBy=[[name,asc],[email,desc]] (%5B%5Bname%2Casc%5D%2C%5Bemail%2Cdesc%5D%5D) URL encoded
```

## SearchQuery modifiers

### andWhere(field: string, value: string \| number)

andWhere() is only available after a findWhere() (it returns a new SearchQuery instance). This allows you to add more search parameters into your request.

```ts
userService
  .findWhere('first_name', 'abc')
  .andWhere('last_name', '123')
  .andWhere('age', '>33')
  .get();
// GET /resource/search?first_name=abc&last_name=123&age=%3E33
```
