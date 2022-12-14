const db = require("../config/database");
const {
  success,
  systemError,
  created,
  custMsg,
  invalidParameter,
  notFound,
} = require("../helpers/templateResponse");

const getMovies = (params) => {
  return new Promise((resolve) => {
    const query = `select distinct on (t.id,s.id ) m.id, m.name, m.image , TO_CHAR(m.relase_date, 'DD/MM/YYYY')relase_date, m.duration, m.synopsis, c."name" as category, d.name as director, cs."name" as cast,
    s.id as studio_id,s.name as studios,t.id as id_times, t.times as time,tsm.id as tsm_id from movies m
    left join categoriey_movie cm on  m.id  = cm.movies_id join category c on cm.category_id = c.id 
    join director d on m.id = d.movies_id join "cast" cs on m.id = cs.movies_id
    join movies_studio ms on m.id = ms.movie_id  
    join times_studio_movies tsm on ms.id = tsm.movies_studios_id 
    join studios s on ms.studio_id = s.id join times t on tsm.times_id = t.id where m.id = $1`;
    db.query(query, [params], (err, result) => {
      if (err) {
        console.log(err.message);
        resolve(systemError());
      }
      //   console.log(result);
      let id = null;
      let name = null;
      let image = null;
      let relase_date = null;
      let duration = null;
      let synopsis = null;
      let director = null;
      let category = [];
      let cast = [];
      let showtimes = [];
      result.rows.forEach((data) => {
        if (!category.includes(data.category)) category.push(data.category);
        if (!cast.includes(data.cast)) cast.push(data.cast);
        let showdata = showtimes.find((datas) => {
          return datas.hasOwnProperty(data.studios);
        });
        if (!showdata) {
          const news = {
            studio_id: data.studio_id,
            [data.studios]: [
              {
                tsm_id: data.tsm_id,
                id_time: data.id_times,
                time: data.time,
              },
            ],
          };
          showtimes.push(news);
        }
        if (showdata) {
          showtimes.find((datas) => {
            if (datas.hasOwnProperty(data.studios)) {
              if (!datas[data.studios].includes(data.time)) {
                datas[data.studios].push({
                  tsm_id: data.tsm_id,
                  id_time: data.id_times,
                  time: data.time,
                });
              }
            }
          });
        }
        if (data.id !== id) id = data.id;
        if (data.name !== name) name = data.name;
        if (data.image !== image) image = data.image;
        if (data.relase_date !== relase_date) {
          let month = "";
          const DD = data.relase_date.split("/")[0];
          const MM = data.relase_date.split("/")[1];
          const YY = data.relase_date.split("/")[2];
          if (MM === "1") month = "January";
          if (MM === "2") month = "February";
          if (MM === "3") month = "March";
          if (MM === "4") month = "April";
          if (MM === "5") month = "Mei";
          if (MM === "6") month = "June";
          if (MM === "7") month = "July";
          if (MM === "8") month = "Agustus";
          if (MM === "9") month = "September";
          if (MM === "10") month = "October";
          if (MM === "11") month = "November";
          if (MM === "12") month = "December";
          let sendDate = `${month} ${DD}, ${YY}`;
          relase_date = sendDate;
        }
        if (data.duration !== duration) duration = data.duration;
        if (data.synopsis !== synopsis) synopsis = data.synopsis;
        if (data.director !== director) director = data.director;
      });
      const data = {
        id,
        name,
        image,
        relase_date,
        duration,
        synopsis,
        director,
        category,
        cast,
        showtimes,
      };
      resolve(success(data));
    });
  });
};

const getallMovies = (params, hostApi) => {
  return new Promise((resolve) => {
    let link = `${hostApi}/api/v1/product?`;
    let query = `select distinct m.id,m.name, m.image, string_agg(distinct (c."name") , ', ')category from movies m
    left join categoriey_movie cm on  m.id  = cm.movies_id join category c on cm.category_id = c.id
    join director d on m.id = d.movies_id join "cast" cs on m.id = cs.movies_id
    join movies_studio ms on m.id = ms.movie_id  
    join times_studio_movies tsm on ms.id = tsm.movies_studios_id 
    join times t on tsm.times_id = t.id`;
    if (params.search) {
      query += ` where lower(m.name) like lower('%${params.search}%')`;
      link += `search=${params.search}&`;
    }
    if (params.category && !params.search) {
      query += ` where cm.category_id = '${params.category}'`;
      link += `category=${params.category}&`;
    }
    if (params.category && params.search) {
      query += ` and cm.category_id = '${params.category}'`;
      link += `search=${params.search}&category=${params.category}`;
    }
    if (params.cast && !params.search) {
      query += ` where lower(cs.name) like lower('%${params.cast}%')`;
      link += `cast=${params.cast}`;
    }
    if (params.cast && params.search) {
      query += ` and lower(cs.name) like lower('%${params.cast}%')`;
      link += `search=${params.search}&cast=${params.cast}`;
    }
    if (params.director && !params.search) {
      query += ` where lower(d.name) like lower('%${params.director}%')`;
      link += `director=${params.director}`;
    }
    if (params.director && params.search) {
      query += ` and lower(d.name) like lower('%${params.director}%')`;
      link += `search=${params.search}&director=${params.director}`;
    }
    if (params.studio && !params.search) {
      query += ` where s.id = '${params.studio}'`;
      link += `studio=${params.studio}`;
    }
    if (params.studio && params.search) {
      query += ` and s.id = '${params.studio}'`;
      link += `search=${params.search}&studio=${params.studio}`;
    }
    query += ` group by m.id,m.name, m.image,m.relase_date,m.duration,m.synopsis ,d."name"`;
    let values = [];
    if (params.page && params.limit) {
      let page = parseInt(params.page);
      let limit = parseInt(params.limit);
      let offset = (page - 1) * limit;
      query += ` limit $1 offset $2`;
      values.push(limit, offset);
    }
    db.query(
      `select distinct m.id,m.name, m.image, string_agg(distinct (c."name") , ', ')category from movies m
      left join categoriey_movie cm on  m.id  = cm.movies_id join category c on cm.category_id = c.id
      join director d on m.id = d.movies_id join "cast" cs on m.id = cs.movies_id
      join movies_studio ms on m.id = ms.movie_id  
      join times_studio_movies tsm on ms.id = tsm.movies_studios_id 
      join times t on tsm.times_id = t.id group by m.id,m.name, m.image,m.relase_date,m.duration,m.synopsis ,d."name"`,
      (err, getData) => {
        db.query(query, values, (err, res) => {
          if (err) {
            console.log(err.message);
            resolve(systemError());
          }
          if (res.rowCount === 0) return resolve(notFound());
          if (res.rows.length === 0) return resolve(notFound());
          let resNext = null;
          let resPrev = null;
          if (params.page && params.limit) {
            let page = parseInt(params.page);
            let limit = parseInt(params.limit);
            let start = (page - 1) * limit;
            let end = page * limit;
            let dataNext = Math.ceil(getData.rowCount / limit);
            if (start <= getData.rowCount) {
              next = page + 1;
            }
            if (end > 0) {
              prev = page - 1;
            }
            if (parseInt(next) <= parseInt(dataNext)) {
              resNext = `${link}page=${next}&limit=${limit}`;
            }
            if (parseInt(prev) !== 0) {
              resPrev = `${link}page=${prev}&limit=${limit}`;
            }
            let sendResponse = {
              dataCount: getData.rows.length,
              next: resNext,
              prev: resPrev,
              page: page,
              totalPage: dataNext,
              data: res.rows,
            };
            return resolve(success(sendResponse));
          }
          let sendResponse = {
            dataCount: getData.rows.length,
            next: resNext,
            prev: resPrev,
            totalPage: null,
            data: res.rows,
          };
          resolve(success(sendResponse));
        });
      }
    );
  });
};

const getShowMovies = (params) => {
  return new Promise((resolve) => {
    const { month } = params;
    const query = `
    select distinct m.id, m.name, m.image, string_agg(distinct (c."name") , ',')category,TO_CHAR(ms.start_show  , 'DD/MM/YYYY') as start_show,
    TO_CHAR(ms.end_show  , 'DD/MM/YYYY') as end_show from movies m
    left join categoriey_movie cm on  m.id  = cm.movies_id
    join category c on cm.category_id = c.id join director d on m.id = d.movies_id join "cast" cs on m.id = cs.movies_id
    join movies_studio ms on m.id = ms.movie_id  
    join times_studio_movies tsm on ms.id = tsm.movies_studios_id 
    join times t on tsm.times_id = t.id
    group by m.id,m.name, m.image,m.relase_date,m.duration,m.synopsis ,d."name",start_show,end_show
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.log(err.message);
        resolve(systemError());
      }
      let nowShowing = [];
      let upComing = [];
      let today = new Date();
      let dd = String(today.getDate()).padStart(2, "0");
      let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      let yyyy = today.getFullYear();
      // today = yyyy + "/" + mm + "/" + dd;
      today = dd + "/" + mm + "/" + yyyy;

      results.rows.some((data) => {
        const startDD = data.start_show.split("/")[0];
        const startMM = data.start_show.split("/")[1] - 1;
        const startYY = data.start_show.split("/")[2];
        const endDD = data.end_show.split("/")[0];
        const endMM = data.end_show.split("/")[1] - 1;
        const endYY = data.end_show.split("/")[2];
        let startDay = new Date(startYY, startMM, startDD);
        let endDay = new Date(endYY, endMM, endDD);
        let now = new Date();
        now.setDate(now.getDate() - 1);
        if (new Date() > startDay) {
          if (now < endDay) nowShowing.push(data);
        }
        if (new Date() < startDay) {
          if (now < endDay) {
            if (month) {
              if (data.start_show.split("/")[1] === month) upComing.push(data);
            }
            if (!month) {
              upComing.push(data);
            }
          }
        }
      });
      const senData = {
        nowShowing,
        upComing,
      };
      resolve(success(senData));
    });
  });
};

const createMovie = (body, file, movie_id) => {
  return new Promise((resolve, reject) => {
    db.connect((err, client, done) => {
      const shouldAbort = (err) => {
        if (err) {
          console.error("Error in Created", err.stack);
          resolve(invalidParameter());
          client.query("ROLLBACK", (err) => {
            if (err) {
              console.log(systemError(err.stack));
              resolve(systemError(err.stack));
            }
            done();
          });
        }
        return !!err;
      };
      client.query("BEGIN", (err) => {
        if (shouldAbort(err)) return;
        const {
          title,
          category,
          date,
          duration,
          director,
          casts,
          synopsis,
          showtimes,
          start_show,
          end_show,
        } = body;
        if (
          !title ||
          !category ||
          !date ||
          !duration ||
          !director ||
          !casts ||
          !synopsis ||
          !showtimes ||
          !start_show ||
          !end_show
        )
          return resolve(custMsg("All data must be filled"));
        const insertMovie = `insert into movies (id,name, relase_date, duration, synopsis, image) values ($1,$2,$3,$4,$5,$6) RETURNING id`;
        client.query(
          insertMovie,
          [movie_id, title, date, duration, synopsis, file.url],
          (err, resMovie) => {
            // console.log("Movie");
            if (shouldAbort(err)) return;
            // console.log("Movie Selesai");
            const insertDirector = `insert into "director" (movies_id,name) values ($1,$2) RETURNING id`;
            client.query(
              insertDirector,
              [movie_id, director],
              (err, resDirect) => {
                // console.log("dircet");
                if (shouldAbort(err)) return;
                // console.log("dircet selesai");
                const direct_id = resDirect.rows[0].id;
                const insertCasts = `insert into "cast"(movies_id, name) values ($1, $2)`;
                casts.split(",").forEach((dataCasts) => {
                  client.query(
                    insertCasts,
                    [movie_id, dataCasts],
                    (err, resCast) => {
                      // console.log("cast");
                      if (shouldAbort(err)) return;
                      // console.log("cast selesai");
                    }
                  );
                });
                const insertCategory = `insert into "categoriey_movie" (movies_id,category_id) values ($1,$2)`;
                category.split(",").forEach((dataCtg) => {
                  client.query(
                    insertCategory,
                    [movie_id, dataCtg],
                    (err, resCategory) => {
                      // console.log("ctgM");
                      if (shouldAbort(err)) return;
                      // console.log("ctgM Selesai");
                    }
                  );
                });
                const insertMoviesStudio = `insert into "movies_studio"(movie_id, studio_id, start_show, end_show) values ($1,$2,$3,$4) RETURNING id`;
                const instertStudios = `insert into "times_studio_movies"(movies_studios_id,times_id) values ($1,$2)`;
                const objectStringArray = new Function(
                  "return" + showtimes + ""
                )();
                console.log(objectStringArray);
                objectStringArray.forEach((dataPremiere) => {
                  const premier = JSON.parse(JSON.stringify(dataPremiere));
                  const studioName = premier.studio;
                  client.query(
                    insertMoviesStudio,
                    [movie_id, studioName, start_show, end_show],
                    (err, resMS) => {
                      if (shouldAbort(err)) return;
                      const movies_studios_id = resMS.rows[0].id;
                      dataPremiere.times.forEach((dataTime) => {
                        client.query(
                          instertStudios,
                          [movies_studios_id, dataTime],
                          (err, resStudios) => {
                            // console.log("tsm");
                            if (shouldAbort(err)) return;
                            // console.log("tsm selesai");
                          }
                        );
                      });
                    }
                  );
                });
                client.query("COMMIT", (err) => {
                  if (err) {
                    console.error("Error committing transaction", err.stack);
                    resolve(systemError());
                  }
                  const query = `select m.id, m.name, m.image , m.relase_date , m.duration, m.synopsis, c."name" as category, d.name as director, cs."name" as cast,
                  s.name as studios, t.times as time from movies m
                  left join categoriey_movie cm on  m.id  = cm.movies_id join category c on cm.category_id = c.id 
                  join director d on m.id = d.movies_id join "cast" cs on m.id = cs.movies_id
                  join movies_studio ms on m.id = ms.movie_id  
                  join times_studio_movies tsm on ms.id = tsm.movies_studios_id 
                  join studios s on ms.studio_id = s.id join times t on tsm.times_id = t.id where m.id = $1`;
                  db.query(query, [movie_id], (err, result) => {
                    if (err) {
                      console.log(err.message);
                      resolve(systemError());
                    }
                    //   console.log(result);
                    let id = null;
                    let name = null;
                    let image = null;
                    let relase_date = null;
                    let duration = null;
                    let synopsis = null;
                    let director = null;
                    let category = [];
                    let cast = [];
                    let showtimes = [];
                    result.rows.forEach((data) => {
                      if (!category.includes(data.category))
                        category.push(data.category);
                      if (!cast.includes(data.cast)) cast.push(data.cast);
                      let showdata = showtimes.find((datas) => {
                        return datas.hasOwnProperty(data.studios);
                      });
                      if (!showdata) {
                        const news = {
                          [data.studios]: [data.time],
                        };
                        showtimes.push(news);
                      }
                      if (showdata) {
                        showtimes.find((datas) => {
                          if (datas.hasOwnProperty(data.studios)) {
                            if (!datas[data.studios].includes(data.time)) {
                              datas[data.studios].push(data.time);
                            }
                          }
                        });
                      }
                      if (data.id !== id) id = data.id;
                      if (data.name !== name) name = data.name;
                      if (data.image !== image) image = data.image;
                      if (data.relase_date !== relase_date)
                        relase_date = data.relase_date;
                      if (data.duration !== duration) duration = data.duration;
                      if (data.synopsis !== synopsis) synopsis = data.synopsis;
                      if (data.director !== director) director = data.director;
                    });
                    const data = {
                      id,
                      name,
                      image,
                      relase_date,
                      duration,
                      synopsis,
                      director,
                      category,
                      cast,
                      showtimes,
                    };
                    resolve(created(data));
                    done();
                  });
                });
              }
            );
          }
        );
      });
    });
  });
};

const deleteMovie = (id) => {
  return new Promise((resolve) => {
    const queryTMS = `delete from times_studio_movies where movies_id = $1`;
    const queryDirector = `delete from director where movies_id = $1`;
    const queryCast = `delete from "cast" where movies_id = $1`;
    const queryCategory = `delete from categoriey_movie where movies_id = $1`;
    const queryMovies = `delete from movies where id = $1`;
    db.query(queryTMS, [id], (err, resTMS) => {
      db.query(queryDirector, [id], (err, resDir) => {
        db.query(queryCast, [id], (err, resCast) => {
          db.query(queryCategory, [id], (err, resCtg) => {
            db.query(queryMovies, [id], (err, resMovies) => {
              resolve(success(`Success Delete ID.${id}`));
            });
          });
        });
      });
    });
  });
};

const getStudios = () => {
  return new Promise((resolve) => {
    const query = "select * from studios";
    db.query(query, (err, result) => {
      if (err) resolve(systemError());
      resolve(success(result.rows));
    });
  });
};

const movieRepo = {
  getMovies,
  getallMovies,
  getShowMovies,
  createMovie,
  deleteMovie,
  getStudios,
};

module.exports = movieRepo;
