import React, { useEffect, useState } from 'react';

import './App.css';

import { connect } from 'react-redux';

import * as actions from './actions';

function App({ addNews }) {
  const [custom, setCust] = useState({});

  const [loader, setLoader] = useState(false);

  useEffect(() => {
    fetch('/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        select:
          '`posts.content`, `users.username`, `users.email`, `dis.created_at`, `dis.title`',
        table: '`discussion_tag as tag`',
        left: `.leftJoin('discussions as dis','tag.discussion_id', 'dis.id')
        .leftJoin('posts', 'dis.id', 'posts.discussion_id')
        .leftJoin('users', 'dis.user_id', 'users.id')`,
        where: `
          .where('tag.tag_id', 2)
          .andWhereNot('posts.type','discussionTagged')
          .andWhere('posts.number',1)`
      })
    })
      .then(res => res.json())
      .then(data => {
        setCust({ data });
      })
      .then(() => setLoader(true));
  }, []);

  const showNews = ({ title, content, created_at, username, email }, index) => {
    var date = new Date(created_at);
    date.toString();

    addNews(content, username, email, created_at, title);

    return (
      <div key={index}>
        <div>{title}</div>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  };

  return (
    <div>
      {!loader ? (
        <div>Loading ...</div>
      ) : (
        custom.data.map((data, index) => {
          return showNews(data, index);
        })
      )}
    </div>
  );
}

export default connect(null, { addNews: actions.addNews })(App);
