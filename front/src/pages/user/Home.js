import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getRestList, getTags } from '../../api/restaurants';

import KeywordSelector from './components/HomeKeywords';
import HomeMap from './components/HomeMap';
import HomeList from './components/HomeList';

import './Home.scss';

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('map');

  // 검색
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  // 데이터
  const [restaurantList, setRestaurantList] = useState([]);

  // 필터 목록
  const [allDepth1, setAllDepth1] = useState([]);
  const [allFoodCategories, setAllFoodCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // 선택값
  const [selectedDepth1, setSelectedDepth1] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);

  const [loading, setLoading] = useState(false);
  const [noResult, setNoResult] = useState(false);

  const location = useLocation();

  /* 로고 클릭 시 초기화 */
  useEffect(() => {
    if (location.pathname === '/' && location.search === '') {
      resetAllFilters();
    }
  }, [location.pathname, location.search]);

  /* 검색 리셋 */
  const resetAllFilters = () => {
    setKeyword('');
    setSearch('');
    setSelectedDepth1(null);
    setSelectedFood(null);
    setSelectedTags([]);
  };

  /* 초기 조회 */
  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const foodTags = (await getTags('food')).data.result;
        setAllFoodCategories(foodTags);
        const tags = (await getTags('tag')).data.result;
        setAllTags(tags);
      } finally {
        setLoading(false);
      }
    };
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const { data } = await getRestList();
        const items = data.result.items;
        setRestaurantList(items);
        setAllDepth1(
          items
            .map((r) => r.region?.depth1)
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
    fetchRestaurants();
  }, []);

  /* 검색 및 필터링 */
  useEffect(() => {
    const fetchfilteredRestaurants = async () => {
      setLoading(true);
      try {
        const params = {
          q: search || undefined,
          food: selectedFood || undefined,
          tags: selectedTags.join(',') || undefined,
        };
        const { data } = await getRestList(params);
        const items = data.result.items;
        setRestaurantList(items);
        setNoResult(items.length === 0);
        setAllDepth1(
          items
            .map((r) => r.region?.depth1)
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchfilteredRestaurants();
  }, [search, selectedDepth1, selectedFood, selectedTags]);

  /* 검색 */
  const handleSearch = () => setSearch(keyword);
  const handleSearchEnter = (e) => {
    if (e.key === 'Enter') handleSearch();
  };
  const resetSearch = () => {
    setKeyword('');
    setSearch('');
  };

  return (
    <div className="home">
      {/* 1. 검색창 */}
      <section className="home-search">
        <div className="search-box">
          <input
            placeholder="검색어를 입력해주세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleSearchEnter}
          />
          {keyword && (
            <img
              src="/assets/icon_reset_gray.png"
              alt="icon_reset_gray"
              className="search-box__icon1"
              onClick={resetSearch}
            />
          )}
          <img src="/assets/icon_magni.png" alt="검색" className="search-box__icon2" onClick={handleSearch} />
        </div>

        {/* 2. 키워드 */}
        <div className="home-tabs">
          <div className="home-tabs__nav">
            <button className={`home-tabs__tab ${activeTab === 0 ? 'is-active' : ''}`} onClick={() => setActiveTab(0)}>
              Where 2 eat?
            </button>
            <button className={`home-tabs__tab ${activeTab === 1 ? 'is-active' : ''}`} onClick={() => setActiveTab(1)}>
              What 2 eat?
            </button>
            <button className={`home-tabs__tab ${activeTab === 2 ? 'is-active' : ''}`} onClick={() => setActiveTab(2)}>
              When 2 eat?
            </button>
          </div>
          <div className="home-tabs__panel">
            {activeTab === 0 && (
              <KeywordSelector mode="old" list={allDepth1} selected={selectedDepth1} onSelect={setSelectedDepth1} />
            )}

            {activeTab === 1 && (
              <KeywordSelector
                mode="tree"
                list={allFoodCategories}
                selected={selectedFood}
                onSelect={setSelectedFood}
              />
            )}

            {activeTab === 2 && (
              <KeywordSelector mode="multi" list={allTags} selected={selectedTags} onSelect={setSelectedTags} />
            )}
          </div>
        </div>
      </section>

      {/* 3. 토글 */}
      <section className="home-view-toggle">
        <div className="view-toggle">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`view-toggle__button ${viewMode === 'map' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'map'}>
            <img src="/assets/icon_map.png" alt="지도 보기" className="view-toggle__icon1" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`view-toggle__button ${viewMode === 'list' ? 'is-active' : ''}`}
            aria-pressed={viewMode === 'list'}>
            <img src="/assets/icon_list.png" alt="목록 보기" className="view-toggle__icon2" />
          </button>
        </div>
      </section>

      {/* 4. 결과 */}
      <section className="home-content">
        {loading && <p>Loading...</p>}

        {!loading && noResult && (
          <div className="home-content__noresult">
            <p>검색 결과가 없습니다.</p>
          </div>
        )}

        {!loading &&
          !noResult &&
          (viewMode === 'map' ? <HomeMap list={restaurantList} /> : <HomeList list={restaurantList} />)}
      </section>
    </div>
  );
}
