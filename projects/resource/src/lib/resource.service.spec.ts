import { HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Injectable, Injector } from '@angular/core';
import { async, inject, TestBed } from '@angular/core/testing';

import { ListResponse, Resource, ResourceConfigService, ResourceService } from '../public_api';

/**
 * Sample Model extending from Resource
 */
class User extends Resource {
  static basePath = '/user';

  id: number;
  name: string;
  files: UserFile[]; // for upload API
  created_at: Date; // created_at from database
  instantiated_at: Date;

  onInstantiated() {
    this.instantiated_at = new Date();
  }
}

/**
 * Sample File Interface for upload
 */
interface UserFile {
  id: string;
}

/**
 * Sample Resource extending from ResourceService
 */
@Injectable({
  providedIn: 'root'
})
class UserService extends ResourceService {
  constructor(injector: Injector) {
    super(injector, User);
  }
}

describe('ResourceService', () => {
  let httpMock: HttpTestingController;
  let userService: UserService; // Sample service that extends from ResourceService
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    httpMock = TestBed.get(HttpTestingController);
  });

  // Instantiate the service before each test
  beforeEach(inject([Injector], (injector: Injector) => {
    userService = new UserService(injector);
  }));

  /**
   * Begin Tests
   */
  describe('Service Construction/Configuration Tests', () => {
    it('should be created', () => {
      userService = TestBed.get(UserService);
      expect(userService).toBeTruthy();
    });

    it('should handle different base URL by configuring in ResourceConfig', inject(
      [ResourceConfigService, Injector],
      (resourceConfigService: ResourceConfigService, injector: Injector) => {
        const baseUrl = 'https://hello.world';
        resourceConfigService.setBaseUrl('https://hello.world');
        userService = new UserService(injector);
        expect(userService.apiUrl).toBe(baseUrl + User.basePath);
      }
    ));
  });

  /**
   * GET Tests
   */
  describe('HTTP GET Tests', () => {
    it('should do list() (GET /user)', async(() => {
      userService.list();

      httpMock.expectOne({
        url: '/user',
        method: 'GET'
      });
      httpMock.verify();
    }));

    it('should do list() with only params (GET /user?only=id,name)', async(() => {
      const result = [
        {
          id: 1,
          name: 'abc'
        },
        {
          id: 2,
          name: 'def'
        }
      ];

      userService
        .findAll()
        .only('id', 'name')
        .get()
        .then(
          (response: ListResponse<User>) => {
            const resources = response.data;
            expect(resources.length).toBe(2);
            expect(resources[0] instanceof User).toBeTruthy();
            expect(resources[0] instanceof Resource).toBeTruthy();
            expect(response.meta.count).toBe(2);
          },
          err => {
            throw new Error('should not reject');
          }
        );

      httpMock
        .expectOne({
          url: '/user?only=id,name',
          method: 'GET'
        })
        .flush({
          data: result,
          meta: {
            count: result.length
          }
        });

      httpMock.verify();
    }));

    it('should do list() (GET /user) with params and headers', async(() => {
      userService.list(
        new HttpParams().set('page', '2'),
        new HttpHeaders().set('no-cache', '1')
      );

      httpMock.expectOne((req: HttpRequest<any>) => {
        return (
          req.method === 'GET' &&
          req.url === '/user' &&
          req.headers.get('no-cache') !== undefined
        );
      });
      httpMock.verify();
    }));

    it('should handle findAll() error', async(() => {
      userService
        .findAll()
        .get()
        .then(
          (_: ListResponse<User>) => {
            throw new Error('Should not resolve');
          },
          error => {
            expect(true).toBe(true);
          }
        );

      httpMock
        .expectOne({
          url: '/user',
          method: 'GET'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));

    it('should do findAll() with page and limit params (GET /user?page=2&limit=100', async(() => {
      userService
        .findAll()
        .page(2)
        .limit(100)
        .get();

      httpMock.expectOne({
        url: '/user?limit=100&page=2',
        method: 'GET'
      });
      httpMock.verify();
    }));

    it('should do findAll() with order=[[id,desc]] (GET /user?order=%5B%5B%22id%22,%22desc%22%5D%5D', async(() => {
      userService
        .findAll()
        .orderBy('id', 'desc')
        .get();

      // The escaped url is [[id,desc]]
      httpMock.expectOne({
        url: '/user?order=%5B%5B%22id%22,%22desc%22%5D%5D',
        method: 'GET'
      });
      httpMock.verify();
    }));

    it(`should do findAll() with multiple order params with order=[[id,desc],[name,asc]]
    (GET /user?order=%5B%5B%22id%22,%22desc%22%5D,%5B%22name%22,%22asc%22%5D%5D`, async(() => {
      userService
        .findAll()
        .orderBy('id', 'desc')
        .orderBy('name', 'asc')
        .get();

      // The escaped url is [[id,desc]]
      httpMock.expectOne({
        url:
          '/user?order=%5B%5B%22id%22,%22desc%22%5D,%5B%22name%22,%22asc%22%5D%5D',
        method: 'GET'
      });
      httpMock.verify();
    }));

    it('should do findAll() with custom headers', async(() => {
      userService
        .findAll()
        .header('Authorization', 'Bearer abcdef') // say for JWT
        .header('Cache-control', 'no-cache') // say for JWT
        .get();

      httpMock.expectOne((req: HttpRequest<any>) => {
        return (
          req.method === 'GET' &&
          req.url === '/user' &&
          req.headers.get('Authorization') === 'Bearer abcdef' &&
          req.headers.get('Cache-control') === 'no-cache'
        );
      });
      httpMock.verify();
    }));
  });

  describe('HTTP GET /resource/:id tests', () => {
    it('should do get() (GET /user/:id)', async(() => {
      userService.get(123).then(data => {
        expect(data instanceof User).toBeTruthy();
        expect(data instanceof Resource).toBeTruthy();
        expect(data.id).toBe(123);
      });

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'GET'
        })
        .flush({
          id: 123,
          name: 'abc'
        });
      httpMock.verify();
    }));

    it('should handle get() error when doing get (GET /user/:id)', async(() => {
      userService.get(123).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'GET'
        })
        .error(<ErrorEvent>{});

      httpMock.verify();
    }));

    it('should do get() (GET /user/:id?only=id,name)', async(() => {
      userService
        .findById(123)
        .only('id', 'name')
        .get();

      httpMock.expectOne({
        url: '/user/123?only=id,name',
        method: 'GET'
      });
      httpMock.verify();
    }));

    it('should do get() (GET /user) with params and headers', async(() => {
      userService.get(
        123,
        new HttpParams().set('only', 'id'),
        new HttpHeaders().set('no-cache', '1')
      );

      httpMock.expectOne((req: HttpRequest<any>) => {
        return (
          req.method === 'GET' &&
          req.url === '/user/123' &&
          req.params.get('only') === 'id' &&
          req.headers.get('no-cache') !== undefined
        );
      });
      httpMock.verify();
    }));
  });

  describe('HTTP POST tests', () => {
    it('should do create() (POST /user)', async(() => {
      const user = new User();
      user.name = 'hello';
      userService.create(user).then(
        res => {
          expect(res.id).toBe(123);
          expect(res instanceof User).toBeTruthy();
          expect(res instanceof Resource).toBeTruthy();
        },
        _ => {}
      );

      user.id = 123;
      httpMock
        .expectOne({
          url: '/user',
          method: 'POST'
        })
        .flush(user);

      httpMock.verify();
    }));

    it('should do create() (POST /user) with params and headers', async(() => {
      const user = new User();
      user.name = 'hello';
      userService
        .create(
          user,
          new HttpParams().set('isAdmin', '1'),
          new HttpHeaders().set('no-cache', '1')
        )
        .then(
          res => {
            expect(res.id).toBe(123);
            expect(res instanceof User).toBeTruthy();
            expect(res instanceof Resource).toBeTruthy();
          },
          _ => {}
        );

      user.id = 123;
      httpMock
        .expectOne((req: HttpRequest<any>) => {
          return (
            req.method === 'POST' &&
            req.url === '/user' &&
            req.params.get('isAdmin') === '1' &&
            req.headers.get('no-cache') !== undefined
          );
        })
        .flush(user);
      httpMock.verify();
    }));

    it('should handle create error (POST /user)', async(() => {
      const user = new User();
      user.name = 'hello';
      userService.create(user).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user',
          method: 'POST'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));
  });

  describe('HTTP PUT tests', () => {
    it('should update (PUT /user/:id)', async(() => {
      const user = new User();
      user.id = 123; // Required
      user.name = 'World'; // Let's say you change the user's name
      userService.update(user).then(
        data => {
          expect(data).toBe(user);
        },
        _ => {}
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'PUT'
        })
        .flush(user);
      httpMock.verify();
    }));

    it('should update (PUT /user/:id) with params and headers', async(() => {
      const user = new User();
      user.id = 123; // Required
      user.name = 'World'; // Let's say you change the user's name
      userService
        .update(
          user,
          new HttpParams().set('force', '1'),
          new HttpHeaders().set('no-cache', '1')
        )
        .then(
          data => {
            expect(data).toBe(user);
          },
          _ => {}
        );

      httpMock
        .expectOne((req: HttpRequest<any>) => {
          return (
            req.method === 'PUT' &&
            req.url === '/user/123' &&
            req.params.get('force') === '1' &&
            req.headers.get('no-cache') !== undefined
          );
        })
        .flush(user);
      httpMock.verify();
    }));

    it('should update PUT error (PUT /user/:id)', async(() => {
      const user = new User();
      user.id = 123;
      userService.update(user).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'PUT'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));
  });

  describe('HTTP PATCH tests', () => {
    it('should update (PATCH /user/:id)', async(() => {
      const user = new User();
      user.id = 123;
      userService.patch(user).then(
        data => {
          expect(data).toBe(user);
        },
        _ => {}
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'PATCH'
        })
        .flush(user);
      httpMock.verify();
    }));

    it('should update (PATCH /user/:id) with headers and params', async(() => {
      const user = new User();
      user.id = 123;
      userService
        .patch(
          user,
          new HttpParams().set('force', '1'),
          new HttpHeaders().set('no-cache', '1')
        )
        .then(
          data => {
            expect(data).toBe(user);
          },
          _ => {}
        );

      httpMock
        .expectOne((req: HttpRequest<any>) => {
          return (
            req.method === 'PATCH' &&
            req.url === '/user/123' &&
            req.params.get('force') === '1' &&
            req.headers.get('no-cache') !== undefined
          );
        })
        .flush(user);
      httpMock.verify();
    }));

    it('should handle PATCH error (PATCH /user/:id)', async(() => {
      const user = new User();
      user.id = 123;
      userService.patch(user).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'PATCH'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));
  });

  describe('HTTP DELETE tests', () => {
    it('should do remove() (DELETE /user/id)', async(() => {
      const user = new User();
      user.id = 123;
      userService.remove(user).then(res => {
        expect(res.id).toBe(123);
        expect(res instanceof User).toBeTruthy();
        expect(res instanceof Resource).toBeTruthy();
      });

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'DELETE'
        })
        .flush(null, { status: 203, statusText: 'No Content' });
      httpMock.verify();
    }));

    it('should do remove() (DELETE /user/id) with params and headers', async(() => {
      const user = new User();
      user.id = 123;
      userService
        .remove(
          user,
          new HttpParams().set('force', '1'),
          new HttpHeaders().set('no-cache', '1')
        )
        .then(res => {
          expect(res.id).toBe(123);
          expect(res instanceof User).toBeTruthy();
          expect(res instanceof Resource).toBeTruthy();
        });

      httpMock
        .expectOne((req: HttpRequest<any>) => {
          return (
            req.method === 'DELETE' &&
            req.url === '/user/123' &&
            req.params.get('force') === '1' &&
            req.headers.get('no-cache') !== undefined
          );
        })
        .flush(null, { status: 203, statusText: 'No Content' });
      httpMock.verify();
    }));

    it('should DELETE error (DELETE /user/id)', async(() => {
      const user = new User();
      user.id = 123;
      userService.remove(user).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'DELETE'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));
  });

  describe('Search API (/user/search)', () => {
    it('should do search() (GET /user/search?<params>=<value>)', async(() => {
      userService.search(new HttpParams().set('q', '123')).then(
        (response: ListResponse<User>) => {
          const resources = response.data;
          expect(resources.length).toBe(2);
          expect(resources[0] instanceof User).toBeTruthy();
          expect(resources[0] instanceof Resource).toBeTruthy();
        },
        _ => {}
      );

      const result = [
        <User>{
          id: 123,
          name: 'abc'
        },
        <User>{
          id: 321,
          name: 'def123'
        }
      ];
      httpMock
        .expectOne({
          url: '/user/search?q=123',
          method: 'GET'
        })
        .flush({
          data: result,
          meta: {
            count: result.length
          }
        });
      httpMock.verify();
    }));

    it('should handle search error (GET /user/search?<params>=<value>)', async(() => {
      userService.search(new HttpParams().set('q', '123')).then(
        _ => {
          throw new Error('Should not resolve');
        },
        error => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/search?q=123',
          method: 'GET'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));

    it('should do search() with query builder (GET /user/search?<params>=<value>)', async(() => {
      userService
        .findWhere('id', 123)
        .andWhere('name', 'abc')
        .get()
        .then(
          (response: ListResponse<User>) => {
            const resources = response.data;
            expect(resources.length).toBe(2);
            expect(resources[0] instanceof User).toBeTruthy();
            expect(resources[0] instanceof Resource).toBeTruthy();
          },
          _ => {}
        );

      const result = [
        <User>{
          id: 123,
          name: 'abc'
        },
        <User>{
          id: 321,
          name: 'def123'
        }
      ];
      httpMock
        .expectOne({
          url: '/user/search?id=123&name=abc',
          method: 'GET'
        })
        .flush({
          data: result,
          meta: {
            count: result.length
          }
        });
      httpMock.verify();
    }));

    it('should search with query builder and handle only fields (GET /user/search?<params>=<value>)', async(() => {
      userService
        .findWhere('id', 123)
        .andWhere('name', 'abc')
        .only('id', 'name', 'created_at')
        .get()
        .then(
          (res: ListResponse<User>) => {
            const resources = res.data;
            expect(resources.length).toBe(2);
            expect(resources[0] instanceof User).toBeTruthy();
            expect(resources[0] instanceof Resource).toBeTruthy();
          },
          _ => {}
        );

      const result = [
        <User>{
          id: 123,
          name: 'abc',
          created_at: new Date()
        },
        <User>{
          id: 321,
          name: 'def123',
          created_at: new Date()
        }
      ];
      httpMock
        .expectOne({
          url: '/user/search?only=id,name,created_at&id=123&name=abc',
          method: 'GET'
        })
        .flush({
          data: result,
          meta: {
            count: result.length
          }
        });
      httpMock.verify();
    }));

    it('should handle query builder search error (GET /user/search?<params>=<value>)', async(() => {
      userService
        .findWhere('id', 123)
        .andWhere('name', 'abc')
        .get()
        .then(
          _ => {
            throw new Error('Should not resolve');
          },
          error => {
            expect(true).toBe(true);
          }
        );

      httpMock
        .expectOne({
          url: '/user/search?id=123&name=abc',
          method: 'GET'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));

    describe('bulk operations using search() (PATCH and DELETE)', () => {
      it('should do search() and patch() (PATCH /user/search?<params>=<value>)', async(() => {
        let req: TestRequest;
        userService
          .findWhere('id', 123)
          .andWhere('name', 'abc')
          .patch(<User>{
            name: 'Hello'
          })
          .then(
            res => {
              expect(res).toBe(undefined);
              expect(JSON.stringify(req.request.body)).toBe(
                JSON.stringify({ name: 'Hello' })
              );
            },
            _ => {}
          );

        req = httpMock.expectOne({
          url: '/user/search?id=123&name=abc',
          method: 'PATCH'
        });
        req.flush(null, {
          status: 204,
          statusText: 'No Content'
        });
        httpMock.verify();
      }));

      it('should do search() with multiple entries and send patch (PATCH /user/search?<params>=[<value1>, <value2>, ...])', async(() => {
        userService
          .findWhere('id', [1, 2, 3])
          .andWhere('name', 'abc')
          .patch(<User>{
            name: 'Hello'
          })
          .then(
            res => {
              expect(res).toBe(undefined);
            },
            _ => {}
          );

        httpMock
          .expectOne({
            url: '/user/search?id=1,2,3&name=abc',
            method: 'PATCH'
          })
          .flush(null, { status: 204, statusText: 'No Content' });
        httpMock.verify();
      }));

      it('should do search() and remove() (DELETE /user/search?<params>=<value>)', async(() => {
        userService
          .findWhere('id', 123)
          .andWhere('name', 'abc')
          .remove()
          .then(
            res => {
              expect(res).toBe(undefined);
            },
            _ => {}
          );

        httpMock
          .expectOne({
            url: '/user/search?id=123&name=abc',
            method: 'DELETE'
          })
          .flush(null, {
            status: 204,
            statusText: 'No Content'
          });
        httpMock.verify();
      }));

      it('should search() with multiple entries and do DELETE (DELETE /user/search?<params>=[<value1>, <value2>, ...])', async(() => {
        userService
          .findWhere('id', ['a1', 'a2', 'a3'])
          .andWhere('name', 'abc')
          .remove()
          .then(
            res => {
              expect(res).toBe(undefined);
            },
            _ => {}
          );

        httpMock
          .expectOne({
            url: '/user/search?id=a1,a2,a3&name=abc',
            method: 'DELETE'
          })
          .flush(null, { status: 204, statusText: 'No Content' });
        httpMock.verify();
      }));

      it('should search() and DELETE error (DELETE /user/search?<params>=[<value1>, <value2>, ...])', async(() => {
        userService
          .findWhere('id', ['a1', 'a2', 'a3'])
          .andWhere('name', 'abc')
          .remove()
          .then(
            _ => {
              throw new Error('Should not resolve');
            },
            error => {
              expect(true).toBe(true);
            }
          );

        httpMock
          .expectOne({
            url: '/user/search?id=a1,a2,a3&name=abc',
            method: 'DELETE'
          })
          .error(<ErrorEvent>{});
        httpMock.verify();
      }));
    });
  });

  describe('Upload API (/user/upload or /user/:id/upload) ', () => {
    it('should do upload() with single file (POST /user/upload)', async(() => {
      userService.upload(new FormData()).then(
        (res: UserFile) => {
          expect(res.id).toBe('userFileUUID');
        },
        err => {
          throw new Error('should not reject');
        }
      );

      httpMock
        .expectOne({
          url: '/user/upload',
          method: 'POST'
        })
        .flush(<UserFile>{
          id: 'userFileUUID'
        });
      httpMock.verify();
    }));

    it('should do upload() with multiple files (POST /user/upload)', async(() => {
      userService.upload(new FormData()).then(
        (res: ListResponse<UserFile>) => {
          const resources = res.data;
          expect(resources.length).toBe(2);
        },
        err => {
          throw new Error('should not reject');
        }
      );

      // Returns the ids of the newly uploaded resources
      const results = [<UserFile>{ id: 'uuid1' }, <UserFile>{ id: 'uuid2' }];
      httpMock
        .expectOne({
          url: '/user/upload',
          method: 'POST'
        })
        .flush({
          data: results,
          meta: {
            count: results.length
          }
        });
      httpMock.verify();
    }));

    it('should do upload() error', async(() => {
      userService.upload(new FormData()).then(
        _ => {
          throw new Error('should not resolve');
        },
        err => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/upload',
          method: 'POST'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));

    it('should do uploadFor() (POST /user/123/upload)', async(() => {
      const user = new User();
      user.id = 123;
      userService.uploadFor(user, new FormData()).then(
        (res: UserFile) => {
          expect(res.id).toBe('userFileUUID');
        },
        err => {
          throw new Error('should not reject');
        }
      );

      httpMock
        .expectOne({
          url: '/user/123/upload',
          method: 'POST'
        })
        .flush(<UserFile>{
          id: 'userFileUUID'
        });
      httpMock.verify();
    }));

    it('should do uploadFor() (POST /user/123/upload) with params and headers', async(() => {
      const user = new User();
      user.id = 123;
      userService
        .uploadFor(
          user,
          new FormData(),
          new HttpParams().set('type', 'json'),
          new HttpHeaders().set('no-cache', '1')
        )
        .then(
          (res: ListResponse<UserFile>) => {
            const resources = res.data;
            expect(resources.length).toBe(2);
          },
          err => {
            throw new Error('should not reject');
          }
        );

      // Returns the ids of the newly uploaded resources
      const results = [<UserFile>{ id: 'uuid1' }, <UserFile>{ id: 'uuid2' }];
      httpMock
        .expectOne((req: HttpRequest<any>) => {
          return (
            req.method === 'POST' &&
            req.url === '/user/123/upload' &&
            req.params.get('type') === 'json' &&
            req.headers.get('no-cache') !== undefined
          );
        })
        .flush({
          data: results,
          meta: {
            count: results.length
          }
        });
      httpMock.verify();
    }));

    it('should do uploadFor() error', async(() => {
      const user = new User();
      user.id = 123;
      userService.uploadFor(user, new FormData()).then(
        _ => {
          throw new Error('should not resolve');
        },
        err => {
          expect(true).toBe(true);
        }
      );

      httpMock
        .expectOne({
          url: '/user/123/upload',
          method: 'POST'
        })
        .error(<ErrorEvent>{});
      httpMock.verify();
    }));
  });

  describe('Extra stuff', () => {
    it('should generate index from array', () => {
      const user1 = new User();
      user1.id = 123;
      user1.name = 'User 1';

      const user2 = new User();
      user2.id = 124;
      user2.name = 'User 2';

      const users = [user1, user2];

      const usersIndex = userService.generateIndex(users);
      expect(usersIndex[123].name).toBe('User 1');
      expect(usersIndex[124].name).toBe('User 2');
    });

    it('should handle onInstantiated event for GET /user/:id', async(() => {
      const now = new Date();
      userService.get(123).then((user: User) => {
        expect(user.instantiated_at).toBeTruthy();
        expect(user.instantiated_at instanceof Date).toBeTruthy();
        expect(user.instantiated_at.getTime()).toBeGreaterThanOrEqual(
          now.getTime()
        );
      });

      httpMock
        .expectOne({
          url: '/user/123',
          method: 'GET'
        })
        .flush(<User>{
          id: 123,
          name: 'User 1'
        });

      httpMock.verify();
    }));

    it('should handle onInstantiated event for GET /user', async(() => {
      const now = new Date();
      userService.list().then((res: ListResponse<User>) => {
        const users = res.data;
        expect(users[0].instantiated_at).toBeTruthy();
        expect(users[0].instantiated_at instanceof Date).toBeTruthy();
        expect(users[0].instantiated_at.getTime()).toBeGreaterThanOrEqual(
          now.getTime()
        );
      });

      const result = [
        <User>{
          id: 123,
          name: 'abc',
          created_at: new Date()
        },
        <User>{
          id: 321,
          name: 'def123',
          created_at: new Date()
        }
      ];
      httpMock
        .expectOne({
          url: '/user',
          method: 'GET'
        })
        .flush({
          data: result,
          meta: {
            count: result.length
          }
        });

      httpMock.verify();
    }));

    it('should handle force fresh', async(() => {
      // generally my projects have an HttpInterceptor that loads from cache but skips when the request header no-cache is set
      userService
        .findAll()
        .fresh()
        .get();

      httpMock.expectOne((req: HttpRequest<any>) => {
        return (
          req.method === 'GET' &&
          req.url === '/user' &&
          req.headers.get('no-cache') !== undefined
        );
      });
      httpMock.verify();
    }));
  });
});
